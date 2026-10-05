<?php

namespace Database\Seeders;

use App\Models\Banner;
use Illuminate\Database\Seeder;

class BannerSeeder extends Seeder
{
    public function run(): void
    {
        $banners = [
            [
                'title' => 'Play forward.',
                'subtitle' => 'NEW SEASON / 2026',
                'tag' => 'BỘ SƯU TẬP MỚI',
                'image' => 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=2200&q=90',
                'link' => '/shop',
                'order' => 1,
                'is_active' => true,
            ],
            [
                'title' => 'Find your edge.',
                'subtitle' => 'PRECISION SERIES',
                'tag' => 'CÔNG NGHỆ ĐỘT PHÁ',
                'image' => 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=2200&q=90',
                'link' => '/shop?category=giay-bong-da',
                'order' => 2,
                'is_active' => true,
            ],
            [
                'title' => 'Own the moment.',
                'subtitle' => 'STRIKER ELITE CLUB',
                'tag' => 'CHÍNH HÃNG 100%',
                'image' => 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=2200&q=90',
                'link' => '/shop',
                'order' => 3,
                'is_active' => true,
            ],
        ];

        foreach ($banners as $b) {
            Banner::updateOrCreate(
                ['title' => $b['title']],
                $b
            );
        }
    }
}
