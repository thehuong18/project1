<?php

namespace Database\Seeders;

use App\Models\Review;
use Illuminate\Database\Seeder;

class ReviewSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $reviews = [
            // Product 1: Nike Phantom GX Elite FG
            [
                'order_id' => 'STR-260901-001',
                'product_id' => 1,
                'user_id' => 2,
                'user_name' => 'Nguyễn Văn An',
                'user_avatar' => null,
                'rating' => 5,
                'comment' => 'Giày lên chân rất ôm, đi êm và sút lực tốt lắm shop ơi. Đóng gói cẩn thận 10/10!',
                'created_at' => now()->subDays(5),
                'updated_at' => now()->subDays(5),
            ],
            [
                'order_id' => 'STR-260901-002',
                'product_id' => 1,
                'user_id' => 3,
                'user_name' => 'Trần Minh Hoàng',
                'user_avatar' => null,
                'rating' => 5,
                'comment' => 'Chất liệu Gripknit dính bóng cực đỉnh, đi trời mưa không bị trơn trượt. Rất đáng đồng tiền bát gạo.',
                'created_at' => now()->subDays(3),
                'updated_at' => now()->subDays(3),
            ],
            [
                'order_id' => 'STR-260901-003',
                'product_id' => 1,
                'user_id' => 4,
                'user_name' => 'Lê Quốc Bảo',
                'user_avatar' => null,
                'rating' => 4,
                'comment' => 'Form giày hơi thon một chút nên chân bè cần tăng nửa size, chất lượng da và đinh FG thì không chê vào đâu được.',
                'created_at' => now()->subDays(2),
                'updated_at' => now()->subDays(2),
            ],

            // Product 2: adidas Predator Elite FT FG
            [
                'order_id' => 'STR-260902-001',
                'product_id' => 2,
                'user_id' => 2,
                'user_name' => 'Nguyễn Văn An',
                'user_avatar' => null,
                'rating' => 5,
                'comment' => 'Lưỡi gà gập huyền thoại cực ngầu! Gai cao su Strikeskin tạo độ xoáy bóng rất gắt.',
                'created_at' => now()->subDays(7),
                'updated_at' => now()->subDays(7),
            ],
            [
                'order_id' => 'STR-260902-002',
                'product_id' => 2,
                'user_id' => 5,
                'user_name' => 'Phạm Thu Hà',
                'user_avatar' => null,
                'rating' => 5,
                'comment' => 'Mua tặng bạn trai nhân dịp sinh nhật, bạn mình thích mê luôn. Shop tư vấn size rất nhiệt tình!',
                'created_at' => now()->subDays(4),
                'updated_at' => now()->subDays(4),
            ],

            // Product 3: Nike Mercurial Superfly 10 Elite FG
            [
                'order_id' => 'STR-260903-001',
                'product_id' => 3,
                'user_id' => 3,
                'user_name' => 'Trần Minh Hoàng',
                'user_avatar' => null,
                'rating' => 5,
                'comment' => 'Túi khí Air Zoom 3/4 ở đế đẩy lực bứt tốc cực đã! Cảm giác chạm bóng chân thật và ôm cổ chân êm ái.',
                'created_at' => now()->subDays(6),
                'updated_at' => now()->subDays(6),
            ],
            [
                'order_id' => 'STR-260903-002',
                'product_id' => 3,
                'user_id' => 6,
                'user_name' => 'Hoàng Đức Anh',
                'user_avatar' => null,
                'rating' => 5,
                'comment' => 'Giày siêu nhẹ, đinh bám sân tự nhiên cực tốt. Giao hàng GHN 2 ngày là nhận được, hàng chuẩn chính hãng 100%.',
                'created_at' => now()->subDays(4),
                'updated_at' => now()->subDays(4),
            ],
            [
                'order_id' => 'STR-260903-003',
                'product_id' => 3,
                'user_id' => 4,
                'user_name' => 'Lê Quốc Bảo',
                'user_avatar' => null,
                'rating' => 5,
                'comment' => 'Màu sắc bên ngoài đẹp hơn cả trên ảnh web. Cảm giác rê dắt bóng rất thanh thoát.',
                'created_at' => now()->subDays(1),
                'updated_at' => now()->subDays(1),
            ],

            // Product 4: Puma Future Ultimate FG/AG
            [
                'order_id' => 'STR-260904-001',
                'product_id' => 4,
                'user_id' => 4,
                'user_name' => 'Lê Quốc Bảo',
                'user_avatar' => null,
                'rating' => 5,
                'comment' => 'Dải Fuzionfit360 co giãn rất tốt, chân bè đi vẫn cực kỳ thoải mái không hề bị kích mu bàn chân.',
                'created_at' => now()->subDays(8),
                'updated_at' => now()->subDays(8),
            ],
            [
                'order_id' => 'STR-260904-002',
                'product_id' => 4,
                'user_id' => 2,
                'user_name' => 'Nguyễn Văn An',
                'user_avatar' => null,
                'rating' => 4,
                'comment' => 'Đế FG/AG đá được cả sân cỏ tự nhiên lẫn sân nhân tạo cỏ dày. Rất tiện lợi!',
                'created_at' => now()->subDays(3),
                'updated_at' => now()->subDays(3),
            ],
        ];

        foreach ($reviews as $rev) {
            Review::updateOrCreate(
                [
                    'order_id' => $rev['order_id'],
                    'product_id' => $rev['product_id'],
                    'user_id' => $rev['user_id'],
                ],
                $rev
            );
        }
    }
}
