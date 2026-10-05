<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductVariant;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $productsData = [
            [
                'id' => 1,
                'name' => 'Nike Phantom GX Elite FG',
                'brand' => 'Nike',
                'category_id' => 1,
                'price' => 4290000,
                'old_price' => 4990000,
                'tag' => 'BEST SELLER',
                'stock' => 20,
                'sku' => 'STR-NK-PGX-01',
                'image_url' => 'https://images.unsplash.com/photo-1511886929837-354d827aae26?auto=format&fit=crop&w=900&q=85',
                'images' => [
                    'https://images.unsplash.com/photo-1511886929837-354d827aae26?auto=format&fit=crop&w=900&q=85',
                    'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=900&q=85',
                ],
                'colors' => ['Volt', 'Black'],
                'sizes' => ['39', '40', '41', '42', '43'],
                'description' => 'Đôi giày kiểm soát bóng thế hệ mới với upper Flyknit mềm, kết cấu Gripknit bám bóng đỉnh cao trong mọi điều kiện thời tiết.',
            ],
            [
                'id' => 2,
                'name' => 'Adidas Predator Accuracy.1 FG',
                'brand' => 'Adidas',
                'category_id' => 1,
                'price' => 3890000,
                'old_price' => 4490000,
                'tag' => 'HOT',
                'stock' => 18,
                'sku' => 'STR-AD-PRED-02',
                'image_url' => 'https://images.unsplash.com/photo-1553778263-73a83bab9b0c?auto=format&fit=crop&w=900&q=85',
                'images' => [
                    'https://images.unsplash.com/photo-1553778263-73a83bab9b0c?auto=format&fit=crop&w=900&q=85',
                    'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=900&q=85',
                ],
                'colors' => ['White', 'Red'],
                'sizes' => ['39', '40', '41', '42', '43'],
                'description' => 'Dòng Predator huyền thoại với công nghệ cao su High-Definition Grip giúp những đường chuyền và cú sút có độ xoáy cực đại.',
            ],
            [
                'id' => 3,
                'name' => 'Puma Future Ultimate FG/AG',
                'brand' => 'Puma',
                'category_id' => 1,
                'price' => 3150000,
                'old_price' => 3750000,
                'tag' => 'SALE',
                'stock' => 25,
                'sku' => 'STR-PM-FUT-03',
                'image_url' => 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=900&q=85',
                'images' => [
                    'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=900&q=85',
                    'https://images.unsplash.com/photo-1511886929837-354d827aae26?auto=format&fit=crop&w=900&q=85',
                ],
                'colors' => ['Blue', 'White'],
                'sizes' => ['39', '40', '41', '42', '43'],
                'description' => 'Công nghệ dải nén FUZIONFIT360 ôm sát mu bàn chân, cho phép bạn chơi bóng có hoặc không có dây buộc với sự linh hoạt tuyệt đối.',
            ],
            [
                'id' => 4,
                'name' => 'Mizuno Morelia Neo IV Beta Japan',
                'brand' => 'Mizuno',
                'category_id' => 1,
                'price' => 5450000,
                'old_price' => 5990000,
                'tag' => 'HOT',
                'stock' => 12,
                'sku' => 'STR-MZ-NEO-04',
                'image_url' => 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?auto=format&fit=crop&w=900&q=85',
                'images' => [
                    'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?auto=format&fit=crop&w=900&q=85',
                    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85',
                ],
                'colors' => ['Ruby Red', 'Pearl White'],
                'sizes' => ['39', '40', '41', '42'],
                'description' => 'Chế tác thủ công Made in Japan bằng da Kangaroo siêu mềm cao cấp, trọng lượng siêu nhẹ đem lại cảm giác chạm bóng chân thật đỉnh cao.',
            ],
            [
                'id' => 5,
                'name' => 'Nike Air Zoom Mercurial Superfly 9',
                'brand' => 'Nike',
                'category_id' => 1,
                'price' => 4890000,
                'old_price' => 5390000,
                'tag' => 'SALE',
                'stock' => 16,
                'sku' => 'STR-NK-MERC-05',
                'image_url' => 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85',
                'images' => [
                    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85',
                    'https://images.unsplash.com/photo-1511886929837-354d827aae26?auto=format&fit=crop&w=900&q=85',
                ],
                'colors' => ['Metallic Red Bronze', 'Black/Gold'],
                'sizes' => ['39', '40', '41', '42', '43'],
                'description' => 'Trang bị bộ đệm Zoom Air 3/4 chiều dài chuyên biệt cho bóng đá, cung cấp lực đẩy bứt tốc vượt bậc cho các cầu thủ tốc độ.',
            ],
            [
                'id' => 6,
                'name' => 'Adidas X Crazyfast.1 TF',
                'brand' => 'Adidas',
                'category_id' => 1,
                'price' => 2790000,
                'old_price' => 3200000,
                'tag' => 'BEST SELLER',
                'stock' => 30,
                'sku' => 'STR-AD-CRAZY-06',
                'image_url' => 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=900&q=85',
                'images' => [
                    'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=900&q=85',
                    'https://images.unsplash.com/photo-1553778263-73a83bab9b0c?auto=format&fit=crop&w=900&q=85',
                ],
                'colors' => ['Solar Red', 'Cloud White'],
                'sizes' => ['39', '40', '41', '42', '43'],
                'description' => 'Đế đinh dăm TF chuyên dụng cho mặt sân cỏ nhân tạo Việt Nam, upper siêu mỏng nhẹ tăng khả năng đảo hướng và phản xạ tốc độ cao.',
            ],
        ];

        foreach ($productsData as $data) {
            $product = Product::updateOrCreate(
                ['id' => $data['id']],
                [
                    'name' => $data['name'],
                    'slug' => Str::slug($data['name']),
                    'sku' => $data['sku'],
                    'brand' => $data['brand'],
                    'tag' => $data['tag'] ?? null,
                    'category_id' => $data['category_id'],
                    'price' => $data['price'],
                    'old_price' => $data['old_price'],
                    'stock' => $data['stock'],
                    'image_url' => $data['image_url'],
                    'images' => $data['images'],
                    'colors' => $data['colors'],
                    'sizes' => $data['sizes'],
                    'description' => $data['description'],
                    'is_active' => true,
                ]
            );

            // Seed Product Images
            ProductImage::where('product_id', $product->id)->delete();
            foreach ($data['images'] as $idx => $img) {
                ProductImage::create([
                    'product_id' => $product->id,
                    'image_path' => $img,
                    'is_primary' => $idx === 0,
                    'sort_order' => $idx,
                ]);
            }

            // Seed Product Variants
            ProductVariant::where('product_id', $product->id)->delete();
            foreach ($data['sizes'] as $size) {
                foreach ($data['colors'] as $color) {
                    $variantSku = sprintf('%s-%s-%s', $data['sku'], $size, strtoupper(Str::slug($color)));
                    ProductVariant::create([
                        'product_id' => $product->id,
                        'sku' => $variantSku,
                        'price' => $data['price'],
                        'sale_price' => $data['price'],
                        'stock' => intdiv($data['stock'], max(1, count($data['sizes']) * count($data['colors']))) + 2,
                        'attributes' => [
                            'size' => $size,
                            'color' => $color,
                        ],
                        'is_active' => true,
                    ]);
                }
            }
        }
    }
}
