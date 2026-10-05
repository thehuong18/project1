<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            [
                'id' => 1,
                'name' => 'Giày bóng đá',
                'slug' => 'giay-bong-da',
                'description' => 'Các dòng giày đinh FG, AG, TF chính hãng chất lượng cao cho cầu thủ chuyên nghiệp và phong trào.',
                'is_active' => true,
            ],
            [
                'id' => 2,
                'name' => 'Bóng thi đấu',
                'slug' => 'bong-thi-dau',
                'description' => 'Bóng đá chuẩn FIFA Quality Pro, bền bỉ, độ nảy và quỹ đạo bay ổn định.',
                'is_active' => true,
            ],
            [
                'id' => 3,
                'name' => 'Áo đấu',
                'slug' => 'ao-dau',
                'description' => 'Trang phục thi đấu và luyện tập chất liệu thể thao thoáng khí, thấm hút mồ hôi tối đa.',
                'is_active' => true,
            ],
            [
                'id' => 4,
                'name' => 'Phụ kiện',
                'slug' => 'phu-kien',
                'description' => 'Bọc ống đồng, tất thi đấu chống trượt, găng tay thủ môn và phụ kiện thể thao chuyên dụng.',
                'is_active' => true,
            ],
            [
                'id' => 999,
                'name' => 'Khác',
                'slug' => 'khac',
                'description' => 'Danh mục mặc định của hệ thống',
                'is_active' => true,
            ],
        ];

        foreach ($categories as $cat) {
            Category::updateOrCreate(['id' => $cat['id']], $cat);
        }
    }
}
