<?php

namespace Database\Seeders;

use App\Models\Brand;
use Illuminate\Database\Seeder;

class BrandSeeder extends Seeder
{
    public function run(): void
    {
        $brands = [
            [
                'id' => 1,
                'name' => 'Nike',
                'slug' => 'nike',
                'logo_path' => 'https://upload.wikimedia.org/wikipedia/commons/a/a6/Logo_NIKE.svg',
                'is_active' => true,
            ],
            [
                'id' => 2,
                'name' => 'Adidas',
                'slug' => 'adidas',
                'logo_path' => 'https://upload.wikimedia.org/wikipedia/commons/2/20/Adidas_Logo.svg',
                'is_active' => true,
            ],
            [
                'id' => 3,
                'name' => 'Puma',
                'slug' => 'puma',
                'logo_path' => 'https://upload.wikimedia.org/wikipedia/commons/8/88/Puma_AG_Logo.svg',
                'is_active' => true,
            ],
            [
                'id' => 4,
                'name' => 'Mizuno',
                'slug' => 'mizuno',
                'logo_path' => 'https://upload.wikimedia.org/wikipedia/commons/9/90/Mizuno_logo.svg',
                'is_active' => true,
            ],
            [
                'id' => 5,
                'name' => 'Striker',
                'slug' => 'striker',
                'logo_path' => '/logo.png',
                'is_active' => true,
            ],
            [
                'id' => 999,
                'name' => 'Khác',
                'slug' => 'khac',
                'logo_path' => null,
                'is_active' => true,
            ],
        ];

        foreach ($brands as $brand) {
            Brand::updateOrCreate(['id' => $brand['id']], $brand);
        }
    }
}
