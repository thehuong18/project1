import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Edit3, 
  Eye, 
  EyeOff, 
  X, 
  AlertTriangle, 
  UploadCloud, 
  Layers, 
  Check,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { fetchProducts, createProduct, updateProduct, deleteProduct, fetchCategories, fetchBrands } from '../../services/catalog';
import type { Product, ProductVariant, CategoryItem, BrandItem } from '../../types';

const DEFAULT_CATEGORY: CategoryItem = {
  id: 999,
  name: 'Khác',
  description: 'Danh mục mặc định của hệ thống',
  slug: 'khac',
};

const DEFAULT_BRAND: BrandItem = {
  id: 999,
  name: 'Khác',
  description: 'Thương hiệu mặc định của hệ thống',
};

const getCategoryName = (c: unknown): string => {
  if (!c) return '';
  if (typeof c === 'string') return c;
  const obj = c as { name?: string; title?: string };
  return obj.name || obj.title || '';
};

const getBrandName = (b: unknown): string => {
  if (!b) return '';
  if (typeof b === 'string') return b;
  const obj = b as { name?: string; title?: string };
  return obj.name || obj.title || '';
};

// Helpers to identify and ensure system default items
const isDefaultCategory = (c?: any): boolean => {
  if (!c) return false;
  const name = typeof c === 'string' ? c : (c.name || '');
  return c.id === 999 || c.slug === 'khac' || c.slug === 'other' || name.trim().toLowerCase() === 'khác';
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

// Standardized Presets
const FOOTWEAR_SIZES = ['39', '40', '41', '42', '43', '44'];
const APPAREL_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

const COLOR_PRESETS = [
  { name: 'Volt', hex: '#a3e635' },
  { name: 'Black', hex: '#18181b' },
  { name: 'White', hex: '#ffffff' },
  { name: 'Red', hex: '#ef4444' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Gold', hex: '#eab308' },
  { name: 'Green', hex: '#22c55e' },
];

export const Products: React.FC = () => {
  const [categoriesList, setCategoriesList] = useState<CategoryItem[]>([DEFAULT_CATEGORY]);
  const [brandsList, setBrandsList] = useState<BrandItem[]>([DEFAULT_BRAND]);
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [catsRes, brandsRes, prodsRes] = await Promise.all([
        fetchCategories().catch(() => []),
        fetchBrands().catch(() => []),
        fetchProducts({ per_page: 100 }).catch(() => [])
      ]);

      if (Array.isArray(catsRes) && catsRes.length > 0) {
        setCategoriesList(ensureDefaultCategory(catsRes));
      }
      if (Array.isArray(brandsRes) && brandsRes.length > 0) {
        setBrandsList(ensureDefaultBrand(brandsRes));
      }

      const pRaw: any[] = Array.isArray(prodsRes) ? prodsRes : (prodsRes?.data ?? []);
      if (Array.isArray(pRaw)) {
        setProductsList(
          pRaw.map((p: any) => ({
            ...p,
            price: Number(p.price) || 0,
            oldPrice: p.old_price != null ? Number(p.old_price) : (p.oldPrice != null ? Number(p.oldPrice) : undefined),
            old_price: p.old_price != null ? Number(p.old_price) : (p.oldPrice != null ? Number(p.oldPrice) : undefined),
            stock: Number(p.stock) || 0,
            category: getCategoryName(p.category) || 'Khác',
            brand: getBrandName(p.brand) || 'Khác',
            image: p.image_url ?? p.image ?? '',
            sizes: p.sizes ?? ['40', '41', '42'],
            colors: p.colors ?? ['Volt', 'Black'],
            isActive: Boolean(p.is_active ?? p.isActive ?? true),
            status: (p.is_active === false || p.status === 'inactive') ? 'inactive' : 'active',
          }))
        );
      }
    } catch (err) {
      console.error('Lỗi tải sản phẩm:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [sortBy, setSortBy] = useState<'default' | 'price_asc' | 'price_desc' | 'stock_asc' | 'stock_desc'>('default');

  // Add / Edit Product Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form Fields (Clean initial blank states)
  const [formName, setFormName] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formOldPrice, setFormOldPrice] = useState('');
  const [formImages, setFormImages] = useState<string[]>([]);
  const [formTag, setFormTag] = useState<'' | 'NEW' | 'HOT' | 'SALE' | 'BEST SELLER'>('');
  const [formDescription, setFormDescription] = useState('');
  const [formSizes, setFormSizes] = useState<string[]>([]);
  const [formColors, setFormColors] = useState<string[]>([]);
  const [formVariants, setFormVariants] = useState<ProductVariant[]>([]);
  const [bulkStockInput, setBulkStockInput] = useState<string>('');

  // Prevent invalid characters in number inputs
  const blockInvalidNumberKeys = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['e', 'E', '+', '-', '.'].includes(e.key)) {
      e.preventDefault();
    }
  };

  // Drag and drop & File input ref
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persist products to localStorage
  useEffect(() => {
    localStorage.setItem('crs_admin_products', JSON.stringify(productsList));
  }, [productsList]);

  // Sync categories & brands on storage change or mount
  useEffect(() => {
    const handleStorageChange = () => {
      const storedCats = localStorage.getItem('crs_categories');
      if (storedCats) {
        try { setCategoriesList(ensureDefaultCategory(JSON.parse(storedCats))); } catch {}
      }
      const storedBrands = localStorage.getItem('crs_brands');
      if (storedBrands) {
        try { setBrandsList(ensureDefaultBrand(JSON.parse(storedBrands))); } catch {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Total Stock calculated dynamically from all variants
  const calculatedTotalStock = useMemo(() => {
    if (formVariants.length === 0) return 0;
    return formVariants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
  }, [formVariants]);

  // Auto-combine variants whenever formSizes or formColors change
  const syncVariants = (sizes: string[], colors: string[], currentVariants: ProductVariant[]) => {
    if (sizes.length === 0 || colors.length === 0) {
      return [];
    }
    const combined: ProductVariant[] = [];
    sizes.forEach((sz) => {
      colors.forEach((cl) => {
        const existing = currentVariants.find(
          (v) => v.attributes.size === sz && v.attributes.color === cl
        );
        combined.push({
          sku: existing ? existing.sku : `STR-${sz}-${cl.toUpperCase()}`,
          stock: existing ? existing.stock : 0,
          attributes: { size: sz, color: cl },
          is_active: true,
        });
      });
    });
    return combined;
  };

  // Toggle size & auto-sync variants with Mutually Exclusive logic between Footwear & Apparel
  const toggleSize = (s: string) => {
    setFormSizes((prevSizes) => {
      let nextSizes: string[];
      if (prevSizes.includes(s)) {
        nextSizes = prevSizes.filter((item) => item !== s);
      } else {
        // Mutually exclusive: if clicking Footwear, clear Apparel; if clicking Apparel, clear Footwear
        if (FOOTWEAR_SIZES.includes(s)) {
          nextSizes = [...prevSizes.filter((sz) => !APPAREL_SIZES.includes(sz)), s];
        } else {
          nextSizes = [...prevSizes.filter((sz) => !FOOTWEAR_SIZES.includes(sz)), s];
        }
      }
      setFormVariants((prevVariants) => syncVariants(nextSizes, formColors, prevVariants));
      return nextSizes;
    });
  };

  // Toggle color & auto-sync variants
  const toggleColor = (c: string) => {
    setFormColors((prevColors) => {
      const nextColors = prevColors.includes(c)
        ? prevColors.filter((item) => item !== c)
        : [...prevColors, c];
      setFormVariants((prevVariants) => syncVariants(formSizes, nextColors, prevVariants));
      return nextColors;
    });
  };

  // Set preset sizes & auto-sync (mutually exclusive)
  const handleSelectSizePreset = (preset: string[]) => {
    setFormSizes(preset);
    setFormVariants((prevVariants) => syncVariants(preset, formColors, prevVariants));
  };

  // Handle open modal for Add (Completely reset all inputs to empty)
  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormName('');
    setFormBrand('');
    setFormCategory('');
    setFormPrice('');
    setFormOldPrice('');
    setFormImages([]);
    setFormTag('');
    setFormDescription('');
    setFormSizes([]);
    setFormColors([]);
    setFormVariants([]);
    setBulkStockInput('');
    setModalOpen(true);
  };

  // Handle open modal for Edit
  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setFormName(product.name || '');
    setFormBrand(getBrandName(product.brand));
    setFormCategory(getCategoryName(product.category));
    const cleanPrice = product.price != null ? Math.round(Number(product.price)) : 0;
    const cleanOldPrice = product.oldPrice != null ? Math.round(Number(product.oldPrice)) : 0;
    setFormPrice(cleanPrice > 0 ? String(cleanPrice) : '');
    setFormOldPrice(cleanOldPrice > 0 ? String(cleanOldPrice) : '');
    
    // Set images list
    if (product.images && product.images.length > 0) {
      setFormImages(product.images);
    } else if (product.image) {
      setFormImages([product.image]);
    } else {
      setFormImages([]);
    }

    setFormTag((product.tag as any) || '');
    setFormDescription(product.description || '');
    
    const szs = product.sizes && product.sizes.length > 0 ? product.sizes : [];
    const cls = product.colors && product.colors.length > 0 ? product.colors : [];
    setFormSizes(szs);
    setFormColors(cls);

    // Load existing variants or auto-combine
    if (product.variants && product.variants.length > 0) {
      setFormVariants(syncVariants(szs, cls, product.variants));
    } else if (szs.length > 0 && cls.length > 0) {
      const stockPerVariant = Math.max(0, Math.floor((product.stock || 0) / (szs.length * cls.length)));
      const generated: ProductVariant[] = [];
      szs.forEach((sz) => {
        cls.forEach((cl) => {
          generated.push({
            sku: `STR-${product.id}-${sz}-${cl.toUpperCase()}`,
            stock: stockPerVariant,
            attributes: { size: sz, color: cl },
            is_active: true,
          });
        });
      });
      setFormVariants(generated);
    } else {
      setFormVariants([]);
    }

    setBulkStockInput('');
    setModalOpen(true);
  };

  // Update variant stock directly
  const handleUpdateVariantStock = (index: number, newStock: string) => {
    const parsedStock = Math.max(0, parseInt(newStock, 10) || 0);
    setFormVariants((prev) =>
      prev.map((v, idx) => (idx === index ? { ...v, stock: parsedStock } : v))
    );
  };

  // Apply bulk stock to all current variants
  const handleApplyBulkStock = () => {
    const qty = Math.max(0, parseInt(bulkStockInput, 10) || 0);
    setFormVariants((prev) => prev.map((v) => ({ ...v, stock: qty })));
  };

  // Handle Local File Upload
  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const readers: Promise<string>[] = [];
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const promise = new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) resolve(e.target.result as string);
        };
        reader.readAsDataURL(file);
      });
      readers.push(promise);
    });

    Promise.all(readers).then((newUrls) => {
      if (newUrls.length > 0) {
        setFormImages((prev) => [...prev, ...newUrls]);
        toast.success(`Đã tải lên ${newUrls.length} ảnh!`);
      }
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFilesSelected(e.dataTransfer.files);
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setFormImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    toast.info('Đã xóa ảnh khỏi danh sách');
  };

  const handleSetPrimaryImage = (indexToPrimary: number) => {
    if (indexToPrimary === 0) return;
    setFormImages((prev) => {
      const next = [...prev];
      const [selected] = next.splice(indexToPrimary, 1);
      return [selected, ...next];
    });
    toast.info('Đã chọn làm Thumbnail chính!');
  };

  // Validation helper: Check if old price is invalid (must be strictly greater than sale price)
  const isOldPriceInvalid = useMemo(() => {
    const p = Math.round(Number(formPrice)) || 0;
    const op = formOldPrice ? Math.round(Number(formOldPrice)) : 0;
    return op > 0 && op <= p;
  }, [formPrice, formOldPrice]);

  // Save Product (Create or Update)
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const catStr = getCategoryName(formCategory).trim();
    const brandStr = getBrandName(formBrand).trim();
    const nameStr = (typeof formName === 'string' ? formName : String(formName || '')).trim();

    if (!nameStr) {
      toast.error('Vui lòng nhập tên sản phẩm!');
      return;
    }
    if (!catStr) {
      toast.error('Vui lòng chọn danh mục sản phẩm!');
      return;
    }
    if (!brandStr) {
      toast.error('Vui lòng chọn thương hiệu sản phẩm!');
      return;
    }

    const priceNum = Math.round(Number(formPrice)) || 0;
    if (priceNum <= 0) {
      toast.error('Vui lòng nhập giá bán sản phẩm hợp lệ!');
      return;
    }

    const rawOldPrice = formOldPrice ? Math.round(Number(formOldPrice)) : undefined;
    // If old price is <= price, automatically discard it (set to undefined)
    const oldPriceNum = (rawOldPrice && rawOldPrice > priceNum) ? rawOldPrice : undefined;
    const totalStock = calculatedTotalStock;
    const primaryImage = formImages[0] || 'https://images.unsplash.com/photo-1511886929837-354d827aae26?auto=format&fit=crop&w=900&q=85';

    // Find category_id and brand_id
    const matchedCategory = categoriesList.find((c) => c.name.toLowerCase() === catStr.toLowerCase());
    const matchedBrand = brandsList.find((b) => b.name.toLowerCase() === brandStr.toLowerCase());

    const payload = {
      name: nameStr,
      brand: brandStr,
      brand_id: matchedBrand ? Number(matchedBrand.id) : 1,
      category: catStr,
      category_id: matchedCategory ? Number(matchedCategory.id) : 1,
      price: priceNum,
      oldPrice: oldPriceNum,
      old_price: oldPriceNum,
      stock: totalStock,
      image: primaryImage,
      image_url: primaryImage,
      images: formImages.length > 0 ? formImages : [primaryImage],
      tag: formTag || undefined,
      description: formDescription,
      sizes: formSizes.length > 0 ? formSizes : ['FreeSize'],
      colors: formColors.length > 0 ? formColors : ['Standard'],
      variants: formVariants,
    };

    if (editingProduct) {
      // Update in API
      updateProduct(editingProduct.id, payload)
        .then((updated) => {
          setProductsList((prev) =>
            prev.map((p) => (p.id === editingProduct.id ? { ...p, ...payload, ...updated } : p))
          );
          toast.success(`Đã cập nhật sản phẩm "${formName}" thành công!`);
        })
        .catch(() => {
          toast.error('Lỗi khi cập nhật sản phẩm trên máy chủ.');
        });
    } else {
      // Create new in API
      createProduct(payload)
        .then((created) => {
          const newProduct: Product = {
            id: created.id || Date.now(),
            ...payload,
            ...created,
            isActive: true,
            status: 'active',
          };
          setProductsList((prev) => [newProduct, ...prev]);
          toast.success(`Đã thêm sản phẩm "${formName}" vào kho hàng!`);
        })
        .catch(() => {
          toast.error('Lỗi khi tạo mới sản phẩm trên máy chủ.');
        });
    }

    setModalOpen(false);
  };

  // Toggle Active State (Fast Click from table badge)
  const handleToggleActive = async (id: number) => {
    const current = productsList.find((p) => p.id === id);
    if (!current) return;
    const nextActive = current.isActive === false ? true : false;
    try {
      await updateProduct(id, { is_active: nextActive, status: nextActive ? 'active' : 'inactive' });
      setProductsList((prev) =>
        prev.map((p) => {
          if (p.id === id) {
            toast.info(
              `Đã chuyển sang trạng thái: [${nextActive ? 'Đang bán' : 'Ngừng kinh doanh'}]`
            );
            return { 
              ...p, 
              isActive: nextActive, 
              status: nextActive ? 'active' : 'inactive' 
            };
          }
          return p;
        })
      );
    } catch {
      toast.error('Không thể cập nhật trạng thái sản phẩm trên máy chủ.');
    }
  };

  // Soft Delete Product in API
  const handleSoftDelete = async (id: number, name: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa sản phẩm "${name}" vào thùng rác?`)) {
      try {
        await deleteProduct(id);
        setProductsList((prev) =>
          prev.map((p) => (p.id === id ? { ...p, is_deleted: true, isDeleted: true } : p))
        );
        toast.success(`Đã xóa mềm sản phẩm "${name}" thành công!`);
      } catch {
        toast.error('Không thể xóa sản phẩm trên máy chủ.');
      }
    }
  };

  // Filter & Search Logic (Exclude soft-deleted products)
  const filteredProducts = productsList
    .filter((p) => !p.is_deleted && !p.isDeleted)
    .filter((p) => {
      const q = searchQuery.toLowerCase();
      const catName = getCategoryName(p.category);
      const bName = getBrandName(p.brand);
      const matchesQuery =
        p.name.toLowerCase().includes(q) ||
        bName.toLowerCase().includes(q) ||
        catName.toLowerCase().includes(q);

      const matchesCategory =
        selectedCategory === 'Tất cả' || catName.toLowerCase() === selectedCategory.toLowerCase();

      let matchesStock = true;
      if (stockFilter === 'IN_STOCK') matchesStock = p.stock >= 10;
      if (stockFilter === 'LOW_STOCK') matchesStock = p.stock > 0 && p.stock < 10;
      if (stockFilter === 'OUT_OF_STOCK') matchesStock = p.stock === 0;

      let matchesStatus = true;
      if (statusFilter === 'ACTIVE') matchesStatus = p.isActive !== false && p.status !== 'inactive';
      if (statusFilter === 'INACTIVE') matchesStatus = p.isActive === false || p.status === 'inactive';

      return matchesQuery && matchesCategory && matchesStock && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      if (sortBy === 'stock_asc') return a.stock - b.stock;
      if (sortBy === 'stock_desc') return b.stock - a.stock;
      return 0;
    });

  const activeProductsCount = productsList.filter((p) => !p.is_deleted && !p.isDeleted).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 p-6 rounded-3xl shadow-xl">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight">
            QUẢN LÝ SẢN PHẨM
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Tổng số: <b className="text-lime-400 font-mono">{activeProductsCount}</b> sản phẩm.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-lime-400 to-lime-500 text-zinc-950 font-black text-xs uppercase tracking-wider hover:from-lime-300 hover:to-lime-400 shadow-xl shadow-lime-400/20 hover:scale-105 transition-all"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Thêm sản phẩm mới</span>
        </button>
      </div>

      {/* 2. Search, Category, Status & Filter Bar */}
      <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 p-4 rounded-2xl shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search Field */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên sản phẩm, thương hiệu, danh mục..."
            className="w-full bg-zinc-950/80 border border-zinc-800 text-sm text-zinc-200 placeholder-zinc-500 pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-lime-400/60 transition"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-zinc-950/80 border border-zinc-800 text-xs text-zinc-200 px-3 py-2.5 rounded-xl focus:outline-none focus:border-lime-400"
          >
            <option value="Tất cả">Tất cả danh mục</option>
            {categoriesList.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Status Filter Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-zinc-950/80 border border-zinc-800 text-xs text-zinc-200 px-3 py-2.5 rounded-xl focus:outline-none focus:border-lime-400"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang bán (Active)</option>
            <option value="INACTIVE">Ngừng kinh doanh (Inactive)</option>
          </select>

          {/* Stock Filter Dropdown */}
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as any)}
            className="bg-zinc-950/80 border border-zinc-800 text-xs text-zinc-200 px-3 py-2.5 rounded-xl focus:outline-none focus:border-lime-400"
          >
            <option value="ALL">Tất cả tồn kho</option>
            <option value="IN_STOCK">Còn hàng (≥10)</option>
            <option value="LOW_STOCK">Sắp hết hàng (&lt;10)</option>
            <option value="OUT_OF_STOCK">Hết hàng (0)</option>
          </select>

          {/* Sorting */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-zinc-950/80 border border-zinc-800 text-xs text-zinc-200 px-3 py-2.5 rounded-xl focus:outline-none focus:border-lime-400"
          >
            <option value="default">Mặc định</option>
            <option value="price_asc">Giá: Thấp → Cao</option>
            <option value="price_desc">Giá: Cao → Thấp</option>
            <option value="stock_asc">Tồn kho: Ít → Nhiều</option>
            <option value="stock_desc">Tồn kho: Nhiều → Ít</option>
          </select>
        </div>
      </div>

      {/* 3. Products Data Table */}
      <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 rounded-3xl shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/40 text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                <th className="py-4 px-6">SẢN PHẨM & THUMBNAIL</th>
                <th className="py-4 px-4">DANH MỤC</th>
                <th className="py-4 px-4">GIÁ BÁN / GIÁ GỐC</th>
                <th className="py-4 px-4">BIẾN THỂ</th>
                <th className="py-4 px-4">TỒN KHO TỔNG</th>
                <th className="py-4 px-4">TRẠNG THÁI</th>
                <th className="py-4 px-6 text-right">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-lime-400 border-t-transparent mb-2" />
                    <p className="text-xs font-mono">Đang tải danh sách sản phẩm từ máy chủ...</p>
                  </td>
                </tr>
              ) : filteredProducts.map((product) => {
                const isLowStock = product.stock > 0 && product.stock < 10;
                const isOutOfStock = product.stock === 0;
                const isCurrentlyActive = product.isActive !== false && product.status !== 'inactive';
                const hasDiscount = Boolean(product.oldPrice && product.oldPrice > product.price);

                return (
                  <tr
                    key={product.id}
                    className={`hover:bg-zinc-800/40 transition-colors group ${
                      !isCurrentlyActive ? 'opacity-70 bg-zinc-950/30' : ''
                    }`}
                  >
                    {/* Cột 1: Product & Thumbnail (Name + Brand directly below) */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3.5">
                        <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 flex-shrink-0 group-hover:border-lime-400/50 transition">
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                          {product.tag && (
                            <span className="absolute top-1 left-1 px-1.5 py-0.2 text-[9px] font-black uppercase font-mono bg-lime-400 text-zinc-950 rounded">
                              {product.tag}
                            </span>
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-white group-hover:text-lime-400 transition leading-snug">
                            {product.name}
                          </h3>
                          <div className="text-xs font-semibold text-lime-400 mt-0.5">
                            {getBrandName(product.brand)}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Cột 2: Category (Single Badge only) */}
                    <td className="py-4 px-4">
                      <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-semibold bg-zinc-800/80 text-zinc-300 border border-zinc-700/60">
                        {getCategoryName(product.category)}
                      </span>
                    </td>

                    {/* Cột 3: Price (Strikethrough old price only if oldPrice > price) */}
                    <td className="py-4 px-4">
                      <div className="font-mono font-bold text-lime-400">
                        {Number(product.price).toLocaleString('vi-VN')}₫
                      </div>
                      {hasDiscount && (
                        <div className="font-mono text-xs text-zinc-400 line-through mt-0.5">
                          {Number(product.oldPrice).toLocaleString('vi-VN')}₫
                        </div>
                      )}
                    </td>

                    {/* Cột 4: Variants Breakdown */}
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {product.sizes?.map((size) => (
                          <span
                            key={size}
                            className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-zinc-950 border border-zinc-800 text-zinc-300 rounded"
                          >
                            {size}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Cột 5: Stock Alert */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono font-bold text-sm ${
                            isOutOfStock
                              ? 'text-red-400'
                              : isLowStock
                              ? 'text-amber-400'
                              : 'text-white'
                          }`}
                        >
                          {product.stock}
                        </span>
                        {isOutOfStock ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-red-500/10 text-red-400 border border-red-500/30 rounded-md">
                            Hết hàng
                          </span>
                        ) : isLowStock ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-md flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5" /> Sắp hết
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-md">
                            Sẵn sàng
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Cột 6: Status Active Toggle */}
                    <td className="py-4 px-4">
                      <button
                        onClick={() => handleToggleActive(product.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition hover:scale-105 ${
                          isCurrentlyActive
                            ? 'bg-lime-400/10 text-lime-400 border border-lime-400/30 hover:bg-lime-400/20 shadow-sm shadow-lime-400/10'
                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-zinc-200'
                        }`}
                        title="Bấm để chuyển đổi trạng thái Đang bán / Ngừng kinh doanh"
                      >
                        {isCurrentlyActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        <span>{isCurrentlyActive ? 'Đang bán' : 'Ngừng kinh doanh'}</span>
                      </button>
                    </td>

                    {/* Cột 7: Actions: Edit & Soft Delete Buttons */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(product)}
                          className="p-2 rounded-xl bg-zinc-800/80 hover:bg-lime-400 hover:text-zinc-950 text-zinc-300 transition"
                          title="Sửa sản phẩm & biến thể"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleSoftDelete(product.id, product.name)}
                          className="p-2 rounded-xl bg-zinc-800/80 hover:bg-red-500 hover:text-white text-zinc-400 hover:border-red-500 transition"
                          title="Xóa sản phẩm (Xóa mềm)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-30 text-lime-400" />
                    <p className="text-sm font-semibold">Không tìm thấy sản phẩm nào phù hợp.</p>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('Tất cả');
                        setStockFilter('ALL');
                        setStatusFilter('ALL');
                      }}
                      className="mt-3 text-xs text-lime-400 hover:underline font-bold"
                    >
                      Xóa bộ lọc tìm kiếm
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Add / Edit Product Modal with Variants Management */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-4xl rounded-3xl shadow-2xl p-6 sm:p-8 max-h-[92vh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-lime-400">
                  {editingProduct ? 'CẬP NHẬT DỮ LIỆU & BIẾN THỂ' : 'TẠO MẪU MỚI & BẢNG BIẾN THỂ'}
                </span>
                <h2 className="text-xl font-black text-white mt-0.5">
                  {editingProduct ? 'Chỉnh Sửa Sản Phẩm' : 'Thêm Sản Phẩm Mới'}
                </h2>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveProduct} className="mt-6 space-y-6">
              {/* 1. Basic Info */}
              <div className="space-y-4">
                <h3 className="text-xs font-mono font-bold text-lime-400 uppercase tracking-wider flex items-center gap-2">
                  <Package className="w-3.5 h-3.5" /> 1. THÔNG TIN CƠ BẢN
                </h3>
                
                {/* Product Name */}
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                    Tên sản phẩm *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Nhập tên sản phẩm..."
                    className="w-full bg-zinc-950 border border-zinc-800 text-sm text-zinc-200 placeholder:text-zinc-500 px-4 py-3 rounded-xl focus:outline-none focus:border-zinc-700"
                  />
                </div>

                {/* Category & Brand Simple Dropdowns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Category */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                      Danh mục *
                    </label>
                    <select
                      value={getCategoryName(formCategory)}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 text-sm text-zinc-200 px-4 py-3 rounded-xl focus:outline-none focus:border-zinc-700 font-medium"
                    >
                      <option value="">-- Chọn danh mục --</option>
                      {categoriesList.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Brand */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                      Thương hiệu *
                    </label>
                    <select
                      value={getBrandName(formBrand)}
                      onChange={(e) => setFormBrand(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 text-sm text-zinc-200 px-4 py-3 rounded-xl focus:outline-none focus:border-zinc-700 font-medium"
                    >
                      <option value="">-- Chọn thương hiệu --</option>
                      {brandsList.map((b) => (
                        <option key={b.name} value={b.name}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Price, Old Price & Total Stock */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                      Giá bán (₫) *
                    </label>
                    <input
                      type="number"
                      required
                      min={1000}
                      onKeyDown={blockInvalidNumberKeys}
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                      placeholder="0"
                      className="w-full bg-zinc-950 border border-zinc-800 text-sm font-mono text-zinc-200 placeholder:text-zinc-500 px-4 py-3 rounded-xl focus:outline-none focus:border-zinc-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                      Giá gốc (₫) (Nếu có)
                    </label>
                    <input
                      type="number"
                      min={0}
                      onKeyDown={blockInvalidNumberKeys}
                      value={formOldPrice}
                      onChange={(e) => setFormOldPrice(e.target.value)}
                      placeholder="0"
                      className={`w-full bg-zinc-950 border text-sm font-mono text-zinc-200 placeholder:text-zinc-500 px-4 py-3 rounded-xl focus:outline-none transition ${
                        isOldPriceInvalid 
                          ? 'border-red-500/60 focus:border-red-500 text-red-400' 
                          : 'border-zinc-800 focus:border-zinc-700'
                      }`}
                    />
                    {isOldPriceInvalid && (
                      <p className="text-[11px] text-red-400 mt-1.5 flex items-center gap-1 font-medium">
                        <span>💡</span> Giá gốc phải lớn hơn giá bán để hiển thị thẻ giảm giá
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                      Tồn kho tổng *
                    </label>
                    <input
                      type="number"
                      readOnly
                      value={calculatedTotalStock}
                      placeholder="0"
                      className="w-full bg-zinc-950 border border-zinc-800 text-sm font-mono font-bold text-zinc-400 px-4 py-3 rounded-xl cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Size & Color Selection (Mutually Exclusive Footwear vs Apparel) */}
              <div className="space-y-4 pt-4 border-t border-zinc-800">
                <h3 className="text-xs font-mono font-bold text-lime-400 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5" /> 2. KÍCH CỠ & MÀU SẮC
                </h3>

                {/* Size Selection by 2 Distinct Groups */}
                <div className="space-y-3">
                  {/* Group 1: Size Giày */}
                  <div className="p-3 bg-zinc-950/60 rounded-2xl border border-zinc-800/80">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                        Size Giày (39-44)
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSelectSizePreset(FOOTWEAR_SIZES)}
                        className="text-[11px] font-mono text-lime-400 hover:underline px-2.5 py-0.5 bg-lime-400/10 border border-lime-400/20 rounded-lg transition hover:bg-lime-400/20 font-bold cursor-pointer"
                      >
                        Chọn Size Giày (39-44)
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {FOOTWEAR_SIZES.map((sz) => {
                        const isSelected = formSizes.includes(sz);
                        return (
                          <button
                            type="button"
                            key={sz}
                            onClick={() => toggleSize(sz)}
                            className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition cursor-pointer ${
                              isSelected
                                ? 'bg-lime-400 text-zinc-950 shadow-md shadow-lime-400/20 scale-105'
                                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                            }`}
                          >
                            {sz}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Group 2: Size Áo */}
                  <div className="p-3 bg-zinc-950/60 rounded-2xl border border-zinc-800/80">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                        Size Áo (S-XXL)
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSelectSizePreset(APPAREL_SIZES)}
                        className="text-[11px] font-mono text-lime-400 hover:underline px-2.5 py-0.5 bg-lime-400/10 border border-lime-400/20 rounded-lg transition hover:bg-lime-400/20 font-bold cursor-pointer"
                      >
                        Chọn Size Áo (S-XXL)
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {APPAREL_SIZES.map((sz) => {
                        const isSelected = formSizes.includes(sz);
                        return (
                          <button
                            type="button"
                            key={sz}
                            onClick={() => toggleSize(sz)}
                            className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition cursor-pointer ${
                              isSelected
                                ? 'bg-lime-400 text-zinc-950 shadow-md shadow-lime-400/20 scale-105'
                                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                            }`}
                          >
                            {sz}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Color Presets */}
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                    Chọn màu sắc (Colors)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_PRESETS.map((color) => {
                      const isSelected = formColors.includes(color.name);
                      return (
                        <button
                          type="button"
                          key={color.name}
                          onClick={() => toggleColor(color.name)}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                            isSelected
                              ? 'bg-zinc-800 text-white border-2 border-lime-400 shadow-sm'
                              : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        >
                          <span
                            className="w-3 h-3 rounded-full border border-white/20"
                            style={{ backgroundColor: color.hex }}
                          />
                          <span>{color.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 3. Auto-Combined Super-Compact Grid 3-Columns Variants */}
              <div className="space-y-3 pt-4 border-t border-zinc-800">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <h3 className="text-xs font-mono font-bold text-lime-400 uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5" /> 3. Biến thể sản phẩm ({formVariants.length})
                  </h3>

                  {/* Quick Bulk Stock Tool on the same row */}
                  {formVariants.length > 0 && (
                    <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-xl">
                      <span className="text-xs text-zinc-400 font-medium">Nhập kho nhanh:</span>
                      <input
                        type="number"
                        min="0"
                        onKeyDown={blockInvalidNumberKeys}
                        value={bulkStockInput}
                        onChange={(e) => setBulkStockInput(e.target.value)}
                        className="w-16 bg-zinc-900 border border-zinc-700 text-xs font-mono text-zinc-200 placeholder:text-zinc-500 text-center py-1 rounded-lg focus:outline-none focus:border-zinc-600"
                        placeholder="0"
                      />
                      <button
                        type="button"
                        onClick={handleApplyBulkStock}
                        className="px-2.5 py-1 bg-lime-400 hover:bg-lime-300 text-zinc-950 text-xs font-bold rounded-lg transition cursor-pointer"
                      >
                        Áp dụng
                      </button>
                    </div>
                  )}
                </div>

                {/* 3-Column Super-Compact Grid of Variants */}
                <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
                    {formVariants.map((variant, vIdx) => {
                      const matchedColor = COLOR_PRESETS.find(
                        (c) => c.name.toLowerCase() === (variant.attributes.color || '').toLowerCase()
                      );
                      const colorHex = matchedColor ? matchedColor.hex : '#a3e635';

                      return (
                        <div
                          key={`${variant.attributes.size}-${variant.attributes.color}-${vIdx}`}
                          className="p-1.5 px-2 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-between hover:border-zinc-700 transition"
                        >
                          {/* Badges Size & Color */}
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 bg-zinc-950 border border-zinc-700 text-zinc-200 font-mono font-bold text-xs rounded">
                              {variant.attributes.size}
                            </span>
                            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-zinc-950 border border-zinc-800 rounded">
                              <span
                                className="w-2 h-2 rounded-full border border-white/20"
                                style={{ backgroundColor: colorHex }}
                              />
                              <span className="text-zinc-300 font-medium text-xs">
                                {variant.attributes.color}
                              </span>
                            </div>
                          </div>

                          {/* Stock input */}
                          <input
                            type="number"
                            min={0}
                            onKeyDown={blockInvalidNumberKeys}
                            value={variant.stock === 0 ? '' : variant.stock}
                            onChange={(e) => handleUpdateVariantStock(vIdx, e.target.value)}
                            placeholder="0"
                            className="w-14 bg-zinc-950 border border-zinc-700 rounded py-0.5 px-1 text-zinc-200 placeholder:text-zinc-500 font-mono text-xs text-center focus:outline-none focus:border-zinc-600"
                          />
                        </div>
                      );
                    })}
                  </div>

                  {formVariants.length === 0 && (
                    <div className="py-6 text-center text-zinc-500 text-xs">
                      Vui lòng chọn ít nhất 1 Kích cỡ và 1 Màu sắc ở Bước 2 để tạo danh sách biến thể.
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Hình ảnh sản phẩm (Compact Drag & Drop) */}
              <div className="space-y-3 pt-4 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono font-bold text-lime-400 uppercase tracking-wider flex items-center gap-2">
                    <UploadCloud className="w-3.5 h-3.5" /> 4. HÌNH ẢNH SẢN PHẨM
                  </h3>
                  <span className="text-[11px] font-mono text-zinc-400">
                    Đã tải: <b className="text-lime-400">{formImages.length}</b> ảnh
                  </span>
                </div>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    handleFilesSelected(e.target.files);
                    e.target.value = '';
                  }}
                  className="hidden"
                />

                {/* Compact Drag & Drop Zone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl py-4 px-6 text-center cursor-pointer transition-all min-h-[100px] flex flex-col items-center justify-center ${
                    isDragging
                      ? 'border-lime-400 bg-lime-400/10 shadow-lg shadow-lime-400/20'
                      : 'border-zinc-700 bg-zinc-950/60 hover:border-zinc-600 hover:bg-zinc-900/40'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-zinc-800/80 border border-zinc-700 flex items-center justify-center text-lime-400 mb-2">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-bold text-white">
                    Kéo thả ảnh vào đây hoặc <span className="text-lime-400 underline">Chọn từ máy tính</span>
                  </div>
                </div>

                {/* Image Grid Preview with Delete Button and Primary Selection */}
                {formImages.length > 0 && (
                  <div>
                    <div className="text-[11px] font-mono text-zinc-400 mb-2">
                      💡 Click vào ảnh để chọn làm Thumbnail đại diện
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                      {formImages.map((imgUrl, index) => {
                        const isPrimary = index === 0;
                        return (
                          <div
                            key={index}
                            onClick={() => handleSetPrimaryImage(index)}
                            className={`group relative rounded-xl overflow-hidden aspect-square bg-zinc-950 border-2 cursor-pointer transition ${
                              isPrimary ? 'border-lime-400 ring-2 ring-lime-400/30' : 'border-zinc-800 hover:border-zinc-600'
                            }`}
                          >
                            <img src={imgUrl} alt={`Product ${index + 1}`} className="w-full h-full object-cover" />
                            
                            {/* Primary Badge */}
                            {isPrimary && (
                              <div className="absolute top-1 left-1 bg-lime-400 text-zinc-950 font-mono font-black text-[9px] px-1.5 py-0.5 rounded shadow flex items-center gap-1">
                                <Check className="w-2.5 h-2.5 stroke-[3]" /> THUMBNAIL
                              </div>
                            )}

                            {/* Remove Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveImage(index);
                              }}
                              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition opacity-90 group-hover:opacity-100 cursor-pointer"
                              title="Xóa ảnh này"
                            >
                              <X className="w-3.5 h-3.5 stroke-[3]" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 5. Tag & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-zinc-800">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                    Nhãn Tag (Badge)
                  </label>
                  <select
                    value={formTag}
                    onChange={(e) => setFormTag(e.target.value as any)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-sm text-zinc-200 px-4 py-3 rounded-xl focus:outline-none focus:border-zinc-700 font-medium"
                  >
                    <option value="">Không gắn tag</option>
                    <option value="NEW">NEW</option>
                    <option value="HOT">HOT</option>
                    <option value="SALE">SALE</option>
                    <option value="BEST SELLER">BEST SELLER</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                    Mô tả sản phẩm
                  </label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Nhập mô tả sản phẩm..."
                    className="w-full bg-zinc-950 border border-zinc-800 text-sm text-zinc-200 placeholder:text-zinc-500 p-3 rounded-xl focus:outline-none focus:border-zinc-700"
                  />
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-zinc-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-lime-400/20 transition hover:scale-105 cursor-pointer"
                >
                  {editingProduct ? 'Lưu Thay Đổi' : 'Tạo Sản Phẩm & Biến Thể'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
