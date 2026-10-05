import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Image as ImageIcon, 
  Store, 
  Save, 
  Plus, 
  Edit3, 
  Trash2, 
  Eye, 
  EyeOff, 
  X,
  Layers,
  Tag,
  FolderTree,
  Info,
  Lock
} from 'lucide-react';
import { toast } from 'sonner';
import { fetchBanners, createBanner, updateBanner, deleteBanner } from '../../services/banners';
import { fetchCategories, fetchBrands, fetchProducts } from '../../services/catalog';
import type { BannerSlide, ShopSettings, CategoryItem, BrandItem, Product } from '../../types';

export const DEFAULT_CATEGORY: CategoryItem = {
  id: 999,
  name: 'Khác',
  description: 'Danh mục mặc định của hệ thống',
  slug: 'khac',
};

export const DEFAULT_BRAND: BrandItem = {
  id: 999,
  name: 'Khác',
  description: 'Thương hiệu mặc định của hệ thống',
};

export const INITIAL_SHOP_SETTINGS: ShopSettings = {
  shopName: 'STRIKER SPORT PRO',
  hotline: '1900 8899',
  email: 'support@striker.vn',
  address: 'Tầng 5, Tòa nhà Bitexco, Số 2 Hải Triều, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
  workingHours: '08:00 - 22:00 (Tất cả các ngày trong tuần)',
  copyright: '© 2026 STRIKER SPORT PRO. All rights reserved.',
};

// Helpers to identify and ensure system default items
const isDefaultCategory = (c?: CategoryItem | null): boolean => {
  if (!c) return false;
  return c.id === 999 || c.slug === 'khac' || c.slug === 'other' || c.name.trim().toLowerCase() === 'khác';
};

const isDefaultBrand = (b?: BrandItem | null): boolean => {
  if (!b) return false;
  return b.id === 999 || b.name.trim().toLowerCase() === 'khác';
};

const ensureDefaultCategory = (cats: CategoryItem[]): CategoryItem[] => {
  const hasDefault = cats.some(isDefaultCategory);
  if (!hasDefault) {
    return [...cats, DEFAULT_CATEGORY];
  }
  return cats;
};

const ensureDefaultBrand = (brands: BrandItem[]): BrandItem[] => {
  const hasDefault = brands.some(isDefaultBrand);
  if (!hasDefault) {
    return [...brands, DEFAULT_BRAND];
  }
  return brands;
};

// Lightweight CSS Tooltip Component
const InfoTooltip: React.FC<{ content: string }> = ({ content }) => {
  return (
    <span className="relative group inline-flex items-center ml-1.5 cursor-help">
      <Info className="w-3.5 h-3.5 text-zinc-500 group-hover:text-lime-400 transition-colors" />
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block w-56 p-2 text-[11px] text-zinc-200 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl z-30 text-center font-normal leading-relaxed">
        {content}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-950" />
      </span>
    </span>
  );
};

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'BANNERS' | 'CATEGORIES_BRANDS' | 'SHOP_INFO'>('BANNERS');

  // Shop Settings
  const [settings, setSettings] = useState<ShopSettings>(() => {
    const stored = localStorage.getItem('crs_shop_settings');
    if (!stored) return INITIAL_SHOP_SETTINGS;
    try {
      return JSON.parse(stored) as ShopSettings;
    } catch {
      return INITIAL_SHOP_SETTINGS;
    }
  });

  const [banners, setBanners] = useState<BannerSlide[]>([]);
  const [categoriesList, setCategoriesList] = useState<CategoryItem[]>([DEFAULT_CATEGORY]);
  const [brandsList, setBrandsList] = useState<BrandItem[]>([DEFAULT_BRAND]);
  const [productsList, setProductsList] = useState<Product[]>([]);

  // Sync Banners, Categories, Brands from Database APIs
  useEffect(() => {
    let active = true;

    Promise.all([
      fetchBanners().catch(() => []),
      fetchCategories().catch(() => []),
      fetchBrands().catch(() => []),
      fetchProducts({ per_page: 100 }).catch(() => [])
    ]).then(([bannersRes, catsRes, brandsRes, prodsRes]) => {
      if (!active) return;

      if (Array.isArray(bannersRes) && bannersRes.length > 0) {
        setBanners(bannersRes);
      }

      if (Array.isArray(catsRes) && catsRes.length > 0) {
        setCategoriesList(ensureDefaultCategory(catsRes));
      }

      if (Array.isArray(brandsRes) && brandsRes.length > 0) {
        setBrandsList(ensureDefaultBrand(brandsRes));
      }

      const pList = Array.isArray(prodsRes) ? prodsRes : (prodsRes?.data ?? []);
      if (Array.isArray(pList)) {
        setProductsList(pList);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  // Banner Modal State
  const [bannerModalOpen, setBannerModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<BannerSlide | null>(null);

  // Banner Form Fields
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerSubtitle, setBannerSubtitle] = useState('');
  const [bannerTag, setBannerTag] = useState('');
  const [bannerImage, setBannerImage] = useState('');
  const [bannerLink, setBannerLink] = useState('');
  const [bannerOrder, setBannerOrder] = useState('1');

  // Category Modal State
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [catName, setCatName] = useState('');

  // Brand Modal State
  const [brandModalOpen, setBrandModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<BrandItem | null>(null);
  const [brandName, setBrandName] = useState('');

  // Safe Delete Guard Modals
  const [safeDeleteCatModalOpen, setSafeDeleteCatModalOpen] = useState(false);
  const [targetCategory, setTargetCategory] = useState<CategoryItem | null>(null);
  const [linkedProductsForCat, setLinkedProductsForCat] = useState(0);

  const [safeDeleteBrandModalOpen, setSafeDeleteBrandModalOpen] = useState(false);
  const [targetBrand, setTargetBrand] = useState<BrandItem | null>(null);
  const [linkedProductsForBrand, setLinkedProductsForBrand] = useState(0);

  // Number input key blocker
  const blockInvalidNumberKeys = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['e', 'E', '+', '-', '.'].includes(e.key)) {
      e.preventDefault();
    }
  };

  // Persist Settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('crs_shop_settings', JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('shop-settings-changed'));
    toast.success('Đã lưu thông tin cửa hàng thành công!');
  };

  // Persist Banners
  useEffect(() => {
    localStorage.setItem('crs_homepage_banners', JSON.stringify(banners));
  }, [banners]);

  // Persist Categories & Brands
  useEffect(() => {
    localStorage.setItem('crs_categories', JSON.stringify(categoriesList));
  }, [categoriesList]);

  useEffect(() => {
    localStorage.setItem('crs_brands', JSON.stringify(brandsList));
  }, [brandsList]);

  // Banner Handlers
  const handleOpenAddBanner = () => {
    setEditingBanner(null);
    setBannerTitle('');
    setBannerSubtitle('');
    setBannerTag('');
    setBannerImage('');
    setBannerLink('');
    setBannerOrder(String(banners.length + 1));
    setBannerModalOpen(true);
  };

  const handleOpenEditBanner = (b: BannerSlide) => {
    setEditingBanner(b);
    setBannerTitle(b.title || '');
    setBannerSubtitle(b.subtitle || '');
    setBannerTag(b.tag || '');
    setBannerImage(b.image || '');
    setBannerLink(b.link || '');
    setBannerOrder(String(b.order || 1));
    setBannerModalOpen(true);
  };

  const handleSaveBanner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerTitle.trim()) {
      toast.error('Vui lòng nhập tiêu đề banner!');
      return;
    }

    const payload = {
      title: bannerTitle.trim(),
      subtitle: bannerSubtitle.trim(),
      tag: bannerTag.trim(),
      image: bannerImage.trim() || 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=2200&q=90',
      link: bannerLink.trim(),
      order: parseInt(bannerOrder, 10) || 1,
    };

    if (editingBanner) {
      updateBanner(editingBanner.id, payload)
        .then((updated) => {
          setBanners((prev) =>
            prev.map((b) => (b.id === editingBanner.id ? { ...b, ...payload, ...updated } : b))
          );
          toast.success('Đã cập nhật slide banner trang chủ!');
          window.dispatchEvent(new Event('banners-changed'));
        })
        .catch(() => {
          toast.error('Lỗi khi cập nhật banner trên máy chủ.');
        });
    } else {
      createBanner({ ...payload, is_active: true })
        .then((created) => {
          setBanners((prev) => [...prev, created]);
          toast.success('Đã thêm slide banner mới vào trang chủ!');
          window.dispatchEvent(new Event('banners-changed'));
        })
        .catch(() => {
          toast.error('Lỗi khi tạo mới banner trên máy chủ.');
        });
    }

    setBannerModalOpen(false);
  };

  const handleToggleBanner = async (id: string | number) => {
    const current = banners.find((b) => String(b.id) === String(id));
    if (!current) return;
    const nextState = !current.isActive;
    try {
      await updateBanner(id, { is_active: nextState });
      setBanners((prev) =>
        prev.map((b) => {
          if (String(b.id) === String(id)) {
            toast.info(`${nextState ? 'Đã bật' : 'Đã tắt'} hiển thị slide banner`);
            return { ...b, isActive: nextState };
          }
          return b;
        })
      );
      window.dispatchEvent(new Event('banners-changed'));
    } catch {
      toast.error('Không thể cập nhật trạng thái banner.');
    }
  };

  const handleDeleteBanner = async (id: string | number) => {
    if (window.confirm('Bạn có chắc muốn xóa banner này khỏi trang chủ?')) {
      try {
        await deleteBanner(id);
        setBanners((prev) => prev.filter((b) => String(b.id) !== String(id)));
        toast.info('Đã xóa slide banner');
        window.dispatchEvent(new Event('banners-changed'));
      } catch {
        toast.error('Không thể xóa banner trên máy chủ.');
      }
    }
  };

  // Category Handlers (Name only)
  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCatName('');
    setCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (c: CategoryItem) => {
    if (isDefaultCategory(c)) {
      toast.error('Không thể sửa danh mục mặc định của hệ thống!');
      return;
    }
    setEditingCategory(c);
    setCatName(c.name);
    setCategoryModalOpen(true);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = catName.trim();
    if (!trimmed) {
      toast.error('Vui lòng nhập tên danh mục!');
      return;
    }

    if (editingCategory) {
      if (isDefaultCategory(editingCategory)) {
        toast.error('Không thể sửa danh mục mặc định của hệ thống!');
        setCategoryModalOpen(false);
        return;
      }

      const oldName = editingCategory.name;
      setCategoriesList((prev) =>
        prev.map((c) =>
          c.id === editingCategory.id ? { ...c, name: trimmed } : c
        )
      );

      if (oldName !== trimmed) {
        setProductsList((prev) => {
          const updated = prev.map((p) =>
            p.category === oldName || (editingCategory.id && p.category_id === editingCategory.id)
              ? { ...p, category: trimmed }
              : p
          );
          localStorage.setItem('crs_admin_products', JSON.stringify(updated));
          return updated;
        });
      }
      toast.success(`Đã cập nhật danh mục "${trimmed}" thành công!`);
    } else {
      if (trimmed.toLowerCase() === 'khác') {
        toast.error('Danh mục "Khác" đã tồn tại mặc định trong hệ thống!');
        return;
      }
      const newCat: CategoryItem = {
        id: Date.now(),
        name: trimmed,
        slug: trimmed.toLowerCase().replace(/\s+/g, '-'),
      };
      setCategoriesList((prev) => [...prev, newCat]);
      toast.success(`Đã thêm danh mục "${trimmed}" mới!`);
    }

    setCategoryModalOpen(false);
  };

  const handleInitiateDeleteCategory = (c: CategoryItem) => {
    if (isDefaultCategory(c)) {
      toast.error('Không thể xóa danh mục mặc định của hệ thống!');
      return;
    }
    setTargetCategory(c);
    const linked = productsList.filter(
      (p) => p.category === c.name || (c.id && p.category_id === c.id)
    ).length;
    setLinkedProductsForCat(linked);
    setSafeDeleteCatModalOpen(true);
  };

  const handleConfirmDeleteCategory = () => {
    if (!targetCategory || isDefaultCategory(targetCategory)) return;

    const defaultCat = categoriesList.find(isDefaultCategory) || DEFAULT_CATEGORY;

    let affectedCount = 0;
    const updatedProducts: Product[] = productsList.map((p) => {
      if (p.category === targetCategory.name || (targetCategory.id && p.category_id === targetCategory.id)) {
        affectedCount++;
        return {
          ...p,
          category: defaultCat.name,
          category_id: Number(defaultCat.id) || 999,
        };
      }
      return p;
    });

    setProductsList(updatedProducts);
    localStorage.setItem('crs_admin_products', JSON.stringify(updatedProducts));

    const nextCategories = categoriesList.filter((c) => c.id !== targetCategory.id);
    setCategoriesList(nextCategories);
    localStorage.setItem('crs_categories', JSON.stringify(nextCategories));

    if (affectedCount > 0) {
      toast.info(`Đã tự động chuyển ${affectedCount} sản phẩm về danh mục "${defaultCat.name}".`);
    }
    toast.success(`Đã xóa danh mục "${targetCategory.name}".`);

    setSafeDeleteCatModalOpen(false);
    setTargetCategory(null);
  };

  // Brand Handlers (Name only)
  const handleOpenAddBrand = () => {
    setEditingBrand(null);
    setBrandName('');
    setBrandModalOpen(true);
  };

  const handleOpenEditBrand = (b: BrandItem) => {
    if (isDefaultBrand(b)) {
      toast.error('Không thể sửa thương hiệu mặc định của hệ thống!');
      return;
    }
    setEditingBrand(b);
    setBrandName(b.name);
    setBrandModalOpen(true);
  };

  const handleSaveBrand = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = brandName.trim();
    if (!trimmed) {
      toast.error('Vui lòng nhập tên thương hiệu!');
      return;
    }

    if (editingBrand) {
      if (isDefaultBrand(editingBrand)) {
        toast.error('Không thể sửa thương hiệu mặc định của hệ thống!');
        setBrandModalOpen(false);
        return;
      }

      const oldName = editingBrand.name;
      setBrandsList((prev) =>
        prev.map((b) =>
          b.id === editingBrand.id ? { ...b, name: trimmed } : b
        )
      );

      if (oldName !== trimmed) {
        setProductsList((prev) => {
          const updated = prev.map((p) =>
            p.brand === oldName || (editingBrand.id && p.brand_id === editingBrand.id)
              ? { ...p, brand: trimmed }
              : p
          );
          localStorage.setItem('crs_admin_products', JSON.stringify(updated));
          return updated;
        });
      }
      toast.success(`Đã cập nhật thương hiệu "${trimmed}" thành công!`);
    } else {
      if (trimmed.toLowerCase() === 'khác') {
        toast.error('Thương hiệu "Khác" đã tồn tại mặc định trong hệ thống!');
        return;
      }
      const newBrand: BrandItem = {
        id: Date.now(),
        name: trimmed,
      };
      setBrandsList((prev) => [...prev, newBrand]);
      toast.success(`Đã thêm thương hiệu "${trimmed}" mới!`);
    }

    setBrandModalOpen(false);
  };

  const handleInitiateDeleteBrand = (b: BrandItem) => {
    if (isDefaultBrand(b)) {
      toast.error('Không thể xóa thương hiệu mặc định của hệ thống!');
      return;
    }
    setTargetBrand(b);
    const linked = productsList.filter(
      (p) => p.brand === b.name || (b.id && p.brand_id === b.id)
    ).length;
    setLinkedProductsForBrand(linked);
    setSafeDeleteBrandModalOpen(true);
  };

  const handleConfirmDeleteBrand = () => {
    if (!targetBrand || isDefaultBrand(targetBrand)) return;

    const defaultBrand = brandsList.find(isDefaultBrand) || DEFAULT_BRAND;

    let affectedCount = 0;
    const updatedProducts: Product[] = productsList.map((p) => {
      if (p.brand === targetBrand.name || (targetBrand.id && p.brand_id === targetBrand.id)) {
        affectedCount++;
        return {
          ...p,
          brand: defaultBrand.name,
          brand_id: Number(defaultBrand.id) || 999,
        };
      }
      return p;
    });

    setProductsList(updatedProducts);
    localStorage.setItem('crs_admin_products', JSON.stringify(updatedProducts));

    const nextBrands = brandsList.filter((b) => b.id !== targetBrand.id);
    setBrandsList(nextBrands);
    localStorage.setItem('crs_brands', JSON.stringify(nextBrands));

    if (affectedCount > 0) {
      toast.info(`Đã tự động chuyển ${affectedCount} sản phẩm về thương hiệu "${defaultBrand.name}".`);
    }
    toast.success(`Đã xóa thương hiệu "${targetBrand.name}".`);

    setSafeDeleteBrandModalOpen(false);
    setTargetBrand(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header Toolbar (Clean without redundant sub-headers) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 p-6 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-lime-400 font-semibold uppercase tracking-widest">
            <SettingsIcon className="w-4 h-4" />
            <span>Cấu hình hệ thống & Cửa hàng</span>
          </div>
          <h1 className="text-2xl font-black text-white mt-1 uppercase tracking-tight">
            Cài Đặt Cửa Hàng
          </h1>
        </div>

        {/* Tab Navigation Pills */}
        <div className="flex flex-wrap items-center p-1.5 bg-zinc-950/80 border border-zinc-800 rounded-2xl gap-1">
          <button
            onClick={() => setActiveTab('BANNERS')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'BANNERS'
                ? 'bg-lime-400 text-zinc-950 shadow-md shadow-lime-400/20'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Banner trang chủ</span>
          </button>
          <button
            onClick={() => setActiveTab('CATEGORIES_BRANDS')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'CATEGORIES_BRANDS'
                ? 'bg-lime-400 text-zinc-950 shadow-md shadow-lime-400/20'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Danh mục & Thương hiệu</span>
          </button>
          <button
            onClick={() => setActiveTab('SHOP_INFO')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'SHOP_INFO'
                ? 'bg-lime-400 text-zinc-950 shadow-md shadow-lime-400/20'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Thông tin shop</span>
          </button>
        </div>
      </div>

      {/* 3. Tab 2: Homepage Banners */}
      {activeTab === 'BANNERS' && (
        <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 p-6 sm:p-8 rounded-3xl shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-zinc-800">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wide flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-lime-400" />
                Danh sách slide banner trang chủ
              </h2>
            </div>

            <button
              onClick={handleOpenAddBanner}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-zinc-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-lime-400/20 hover:scale-105 transition cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Thêm slide banner</span>
            </button>
          </div>

          {/* Banners Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {banners.map((b) => (
              <div
                key={b.id}
                className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl overflow-hidden group hover:border-lime-500/50 transition-all shadow-xl flex flex-col justify-between"
              >
                <div>
                  {/* Thumbnail Image */}
                  <div className="relative h-44 w-full overflow-hidden bg-zinc-900">
                    <img
                      src={b.image}
                      alt={b.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent" />
                    <span className="absolute top-3 left-3 px-2 py-0.5 text-[10px] font-mono font-black bg-lime-400 text-zinc-950 rounded uppercase shadow">
                      {b.tag}
                    </span>
                    <span className="absolute top-3 right-3 px-2 py-0.5 text-[10px] font-mono bg-zinc-900/90 text-white rounded border border-zinc-700">
                      Thứ tự #{b.order}
                    </span>
                  </div>

                  {/* Banner Content */}
                  <div className="p-4">
                    <div className="text-[11px] font-mono text-lime-400 font-bold uppercase">{b.subtitle}</div>
                    <h3 className="text-sm font-bold text-white mt-1 leading-snug">{b.title}</h3>
                    <p className="text-xs text-zinc-400 font-mono mt-2 truncate">Link: {b.link}</p>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="p-4 pt-0 flex items-center justify-between border-t border-zinc-800/60 mt-3">
                  <button
                    onClick={() => handleToggleBanner(b.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                      b.isActive
                        ? 'bg-lime-400/10 text-lime-400 border border-lime-400/30'
                        : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                    }`}
                  >
                    {b.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>{b.isActive ? 'Đang hiển thị' : 'Đã ẩn'}</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEditBanner(b)}
                      className="p-2 rounded-xl bg-zinc-800/80 hover:bg-lime-400 hover:text-zinc-950 text-zinc-300 transition cursor-pointer"
                      title="Sửa banner"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteBanner(b.id)}
                      className="p-2 rounded-xl bg-zinc-800/80 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition cursor-pointer"
                      title="Xóa banner"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Tab 3: Categories & Brands Management (Clean 2-Column Section without main-screen footnotes) */}
      {activeTab === 'CATEGORIES_BRANDS' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Column 1: Quản lý Danh mục (Categories) */}
          <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 p-6 sm:p-8 rounded-3xl shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <FolderTree className="w-5 h-5 text-lime-400" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-sm font-bold text-white uppercase tracking-wide">
                        Quản lý danh mục
                      </h2>
                      <InfoTooltip content="Khi xóa danh mục đang có sản phẩm, hệ thống sẽ tự động chuyển sản phẩm về danh mục 'Khác' để bảo toàn hiển thị." />
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Tổng số: <b className="text-lime-400 font-mono">{categoriesList.length}</b> danh mục
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleOpenAddCategory}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-lime-400 hover:bg-lime-300 text-zinc-950 font-black text-xs uppercase tracking-wider shadow-md shadow-lime-400/20 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>+ Thêm danh mục</span>
                </button>
              </div>

              {/* Categories Table */}
              <div className="mt-4 bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-900/80 text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                      <th className="py-3 px-4">Tên danh mục</th>
                      <th className="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {categoriesList.map((cat) => {
                      const isDefault = isDefaultCategory(cat);
                      return (
                        <tr key={cat.id} className="hover:bg-zinc-900/40 transition">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-white hover:text-lime-400 transition">
                                {cat.name}
                              </span>
                              {isDefault && (
                                <span className="px-2 py-0.5 text-[10px] font-mono text-gray-400 bg-gray-800 border border-gray-700/60 rounded-md">
                                  Mặc định
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {isDefault ? (
                              <div className="flex items-center justify-end pr-1">
                                <div className="relative group inline-flex items-center">
                                  <div 
                                    className="p-2 rounded-xl text-zinc-500 bg-zinc-900/60 border border-zinc-800/80 cursor-help transition group-hover:text-zinc-300 group-hover:border-zinc-700"
                                  >
                                    <Lock className="w-3.5 h-3.5" />
                                  </div>
                                  <span className="pointer-events-none absolute bottom-full right-0 mb-1.5 hidden group-hover:block w-64 p-2 text-[11px] text-zinc-200 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl z-30 text-center font-normal leading-relaxed">
                                    Danh mục mặc định của hệ thống - Không thể sửa/xóa
                                    <span className="absolute top-full right-3.5 border-4 border-transparent border-t-zinc-950" />
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleOpenEditCategory(cat)}
                                  className="p-2 rounded-xl bg-zinc-800/80 hover:bg-lime-400 hover:text-zinc-950 text-zinc-300 transition cursor-pointer"
                                  title="Sửa danh mục"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleInitiateDeleteCategory(cat)}
                                  className="p-2 rounded-xl bg-zinc-800/80 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition cursor-pointer"
                                  title="Xóa danh mục"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {categoriesList.length === 0 && (
                      <tr>
                        <td colSpan={2} className="py-6 text-center text-zinc-500">
                          Chưa có danh mục nào.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Column 2: Quản lý Thương hiệu (Brands) */}
          <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 p-6 sm:p-8 rounded-3xl shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-emerald-400" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-sm font-bold text-white uppercase tracking-wide">
                        Quản lý thương hiệu
                      </h2>
                      <InfoTooltip content="Khi xóa thương hiệu đang có sản phẩm, hệ thống sẽ tự động chuyển sản phẩm về thương hiệu 'Khác' để bảo toàn hiển thị." />
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Tổng số: <b className="text-emerald-400 font-mono">{brandsList.length}</b> thương hiệu
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleOpenAddBrand}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-black text-xs uppercase tracking-wider shadow-md shadow-emerald-400/20 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>+ Thêm thương hiệu</span>
                </button>
              </div>

              {/* Brands Table */}
              <div className="mt-4 bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-900/80 text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                      <th className="py-3 px-4">Tên thương hiệu</th>
                      <th className="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {brandsList.map((brand) => {
                      const isDefault = isDefaultBrand(brand);
                      return (
                        <tr key={brand.id} className="hover:bg-zinc-900/40 transition">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-white hover:text-emerald-400 transition">
                                {brand.name}
                              </span>
                              {isDefault && (
                                <span className="px-2 py-0.5 text-[10px] font-mono text-gray-400 bg-gray-800 border border-gray-700/60 rounded-md">
                                  Mặc định
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {isDefault ? (
                              <div className="flex items-center justify-end pr-1">
                                <div className="relative group inline-flex items-center">
                                  <div 
                                    className="p-2 rounded-xl text-zinc-500 bg-zinc-900/60 border border-zinc-800/80 cursor-help transition group-hover:text-zinc-300 group-hover:border-zinc-700"
                                  >
                                    <Lock className="w-3.5 h-3.5" />
                                  </div>
                                  <span className="pointer-events-none absolute bottom-full right-0 mb-1.5 hidden group-hover:block w-64 p-2 text-[11px] text-zinc-200 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl z-30 text-center font-normal leading-relaxed">
                                    Thương hiệu mặc định của hệ thống - Không thể sửa/xóa
                                    <span className="absolute top-full right-3.5 border-4 border-transparent border-t-zinc-950" />
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleOpenEditBrand(brand)}
                                  className="p-2 rounded-xl bg-zinc-800/80 hover:bg-emerald-400 hover:text-zinc-950 text-zinc-300 transition cursor-pointer"
                                  title="Sửa thương hiệu"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleInitiateDeleteBrand(brand)}
                                  className="p-2 rounded-xl bg-zinc-800/80 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition cursor-pointer"
                                  title="Xóa thương hiệu"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {brandsList.length === 0 && (
                      <tr>
                        <td colSpan={2} className="py-6 text-center text-zinc-500">
                          Chưa có thương hiệu nào.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Tab 4: Shop Info */}
      {activeTab === 'SHOP_INFO' && (
        <div className="w-full bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 p-6 sm:p-8 rounded-3xl shadow-2xl">
          <div className="flex items-center gap-2 pb-4 border-b border-zinc-800">
            <Store className="w-5 h-5 text-lime-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wide">
              Thông tin doanh nghiệp & cửa hàng
            </h2>
          </div>

          <form onSubmit={handleSaveSettings} className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Hàng 1: Tên cửa hàng & Hotline */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-2">
                Tên cửa hàng / Thương hiệu *
              </label>
              <input
                type="text"
                required
                value={settings.shopName}
                onChange={(e) => setSettings({ ...settings, shopName: e.target.value })}
                placeholder="STRIKER SPORT PRO"
                className="w-full bg-zinc-950 border border-zinc-800 text-sm text-white px-4 py-3 rounded-xl focus:outline-none focus:border-zinc-700 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-2">
                Hotline CSKH
              </label>
              <input
                type="text"
                value={settings.hotline || ''}
                onChange={(e) => setSettings({ ...settings, hotline: e.target.value })}
                placeholder="Nhập số hotline (ví dụ: 1900 8899)"
                className="w-full bg-zinc-950 border border-zinc-800 text-sm font-mono text-zinc-200 placeholder:text-zinc-500 px-4 py-3 rounded-xl focus:outline-none focus:border-zinc-700"
              />
            </div>

            {/* Hàng 2: Email & Giờ làm việc */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-2">
                Email hỗ trợ
              </label>
              <input
                type="email"
                value={settings.email || ''}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                placeholder="Nhập email hỗ trợ (ví dụ: support@striker.vn)"
                className="w-full bg-zinc-950 border border-zinc-800 text-sm text-zinc-200 placeholder:text-zinc-500 px-4 py-3 rounded-xl focus:outline-none focus:border-zinc-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-2">
                Giờ làm việc
              </label>
              <input
                type="text"
                value={settings.workingHours || ''}
                onChange={(e) => setSettings({ ...settings, workingHours: e.target.value })}
                placeholder="Nhập thời gian làm việc (ví dụ: 08:00 - 22:00)"
                className="w-full bg-zinc-950 border border-zinc-800 text-sm text-zinc-200 placeholder:text-zinc-500 px-4 py-3 rounded-xl focus:outline-none focus:border-zinc-700"
              />
            </div>

            {/* Hàng 3: Địa chỉ (Full width) */}
            <div className="col-span-1 md:col-span-2">
              <label className="block text-xs font-semibold text-zinc-300 mb-2">
                Địa chỉ trụ sở / Kho hàng chính
              </label>
              <input
                type="text"
                value={settings.address || ''}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                placeholder="Nhập địa chỉ trụ sở / kho hàng chính"
                className="w-full bg-zinc-950 border border-zinc-800 text-sm text-zinc-200 placeholder:text-zinc-500 px-4 py-3 rounded-xl focus:outline-none focus:border-zinc-700"
              />
            </div>

            {/* Hàng 4: Chính sách bảo hành & đổi trả (Full width) */}
            <div className="col-span-1 md:col-span-2">
              <label className="block text-xs font-semibold text-zinc-300 mb-2">
                Chính sách bảo hành & đổi trả
              </label>
              <textarea
                rows={4}
                value={settings.warrantyPolicy || ''}
                onChange={(e) => setSettings({ ...settings, warrantyPolicy: e.target.value })}
                placeholder="Nhập quy định đổi trả, bảo hành sản phẩm..."
                className="w-full bg-zinc-950 border border-zinc-800 text-sm text-zinc-200 placeholder:text-zinc-500 p-4 rounded-xl focus:outline-none focus:border-zinc-700 leading-relaxed"
              />
            </div>

            {/* Footer Nút Lưu (Full width, align right) */}
            <div className="col-span-1 md:col-span-2 pt-4 border-t border-zinc-800 flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-lime-400 to-lime-500 text-zinc-950 font-black text-xs uppercase tracking-wider hover:from-lime-300 hover:to-lime-400 shadow-xl shadow-lime-400/20 hover:scale-105 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4 stroke-[3]" />
                <span>Lưu thông tin cửa hàng</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 6. Banner Modal */}
      {bannerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-2xl rounded-3xl shadow-2xl p-6 sm:p-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <h2 className="text-lg font-bold text-white">
                {editingBanner ? 'Sửa slide banner' : 'Thêm slide banner mới'}
              </h2>
              <button
                onClick={() => setBannerModalOpen(false)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBanner} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-2">
                  Tiêu đề chính *
                </label>
                <input
                  type="text"
                  required
                  value={bannerTitle}
                  onChange={(e) => setBannerTitle(e.target.value)}
                  placeholder="Nhập tiêu đề..."
                  className="w-full bg-zinc-950 border border-zinc-800 text-sm text-zinc-200 placeholder:text-zinc-500 px-4 py-3 rounded-xl focus:outline-none focus:border-zinc-700 font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-2">
                    Tiêu đề phụ
                  </label>
                  <input
                    type="text"
                    value={bannerSubtitle}
                    onChange={(e) => setBannerSubtitle(e.target.value)}
                    placeholder="Nhập tiêu đề phụ..."
                    className="w-full bg-zinc-950 border border-zinc-800 text-sm text-zinc-200 placeholder:text-zinc-500 px-4 py-3 rounded-xl focus:outline-none focus:border-zinc-700 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-2">
                    Thẻ nhãn
                  </label>
                  <input
                    type="text"
                    value={bannerTag}
                    onChange={(e) => setBannerTag(e.target.value)}
                    placeholder="Nhập thẻ nhãn..."
                    className="w-full bg-zinc-950 border border-zinc-800 text-sm text-zinc-200 placeholder:text-zinc-500 px-4 py-3 rounded-xl focus:outline-none focus:border-zinc-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-2">
                  Đường dẫn ảnh *
                </label>
                <input
                  type="url"
                  required
                  value={bannerImage}
                  onChange={(e) => setBannerImage(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 placeholder:text-zinc-500 px-4 py-3 rounded-xl focus:outline-none focus:border-zinc-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-2">
                    Liên kết nút
                  </label>
                  <input
                    type="text"
                    value={bannerLink}
                    onChange={(e) => setBannerLink(e.target.value)}
                    placeholder="/shop"
                    className="w-full bg-zinc-950 border border-zinc-800 text-sm text-zinc-200 placeholder:text-zinc-500 px-4 py-3 rounded-xl focus:outline-none focus:border-zinc-700 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-2">
                    Thứ tự hiển thị
                  </label>
                  <input
                    type="number"
                    min={1}
                    onKeyDown={blockInvalidNumberKeys}
                    value={bannerOrder}
                    onChange={(e) => setBannerOrder(e.target.value)}
                    placeholder="1"
                    className="w-full bg-zinc-950 border border-zinc-800 text-sm font-mono text-zinc-200 placeholder:text-zinc-500 px-4 py-3 rounded-xl focus:outline-none focus:border-zinc-700"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setBannerModalOpen(false)}
                  className="px-5 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-zinc-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-lime-400/20 transition hover:scale-105 cursor-pointer"
                >
                  Lưu banner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Category Modal */}
      {categoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-3xl shadow-2xl p-6 sm:p-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-lime-400" />
                {editingCategory ? 'Sửa danh mục' : 'Thêm danh mục mới'}
              </h2>
              <button
                onClick={() => setCategoryModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-2">
                  Tên danh mục *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="Nhập tên danh mục..."
                  className="w-full bg-zinc-950 border border-zinc-800 text-sm text-zinc-200 placeholder:text-zinc-500 px-4 py-3 rounded-xl focus:outline-none focus:border-zinc-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setCategoryModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 text-xs font-bold text-zinc-300 hover:bg-zinc-700 transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-zinc-950 font-black text-xs uppercase tracking-wider shadow-md shadow-lime-400/20 transition cursor-pointer"
                >
                  {editingCategory ? 'Lưu thay đổi' : 'Thêm danh mục'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Brand Modal */}
      {brandModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-3xl shadow-2xl p-6 sm:p-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Tag className="w-5 h-5 text-emerald-400" />
                {editingBrand ? 'Sửa thương hiệu' : 'Thêm thương hiệu mới'}
              </h2>
              <button
                onClick={() => setBrandModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBrand} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-2">
                  Tên thương hiệu *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="Nhập tên thương hiệu..."
                  className="w-full bg-zinc-950 border border-zinc-800 text-sm text-zinc-200 placeholder:text-zinc-500 px-4 py-3 rounded-xl focus:outline-none focus:border-zinc-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setBrandModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 text-xs font-bold text-zinc-300 hover:bg-zinc-700 transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-black text-xs uppercase tracking-wider shadow-md shadow-emerald-400/20 transition cursor-pointer"
                >
                  {editingBrand ? 'Lưu thay đổi' : 'Thêm thương hiệu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. Safe Delete Category Modal */}
      {safeDeleteCatModalOpen && targetCategory && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-3xl shadow-2xl p-6 sm:p-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-red-500/10 border border-red-500/30 text-red-400">
                <Trash2 className="w-6 h-6" />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-white">
                  Xóa danh mục {targetCategory.name}
                </h3>
                <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
                  Danh mục này đang chứa <b className="text-amber-400 font-mono">{linkedProductsForCat}</b> sản phẩm. Sau khi xóa, <b className="text-amber-400 font-mono">{linkedProductsForCat}</b> sản phẩm sẽ tự động chuyển sang danh mục 'Khác'.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setSafeDeleteCatModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCategory}
                className="px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-red-500/20 transition cursor-pointer"
              >
                Xác nhận chuyển & xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. Safe Delete Brand Modal */}
      {safeDeleteBrandModalOpen && targetBrand && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-3xl shadow-2xl p-6 sm:p-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-red-500/10 border border-red-500/30 text-red-400">
                <Trash2 className="w-6 h-6" />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-white">
                  Xóa thương hiệu {targetBrand.name}
                </h3>
                <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
                  Thương hiệu này đang chứa <b className="text-amber-400 font-mono">{linkedProductsForBrand}</b> sản phẩm. Sau khi xóa, <b className="text-amber-400 font-mono">{linkedProductsForBrand}</b> sản phẩm sẽ tự động chuyển sang thương hiệu 'Khác'.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setSafeDeleteBrandModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteBrand}
                className="px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-red-500/20 transition cursor-pointer"
              >
                Xác nhận chuyển & xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
