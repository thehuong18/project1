<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// 9. create_orders_and_order_items_table.php

return new class extends Migration {
    public function up(): void {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_code', 50)->unique();
            $table->string('order_number', 50)->nullable()->index();
            $table->unsignedBigInteger('user_id'); // Tham chiếu Auth Service
            $table->foreignId('coupon_id')->nullable()->constrained('coupons')->onDelete('set null');
            $table->string('shipping_name');
            $table->string('shipping_phone', 15);
            $table->string('phone', 20)->nullable();
            $table->text('shipping_address');
            $table->integer('to_district_id')->nullable();
            $table->string('to_ward_code', 50)->nullable();
            $table->decimal('subtotal', 12, 2);
            $table->decimal('shipping_fee', 12, 2)->default(0.00);
            $table->decimal('discount_amount', 12, 2)->default(0.00);
            $table->decimal('total_amount', 12, 2);
            $table->string('status', 30)->default('pending');
            $table->string('order_status', 30)->default('pending');
            $table->string('payment_status', 30)->default('unpaid');
            $table->string('payment_method', 30)->default('cod');
            $table->string('ghn_code', 100)->nullable();
            $table->text('note')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'order_status', 'payment_status']);
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->onDelete('cascade');
            $table->unsignedBigInteger('product_id')->index(); // Tham chiếu Catalog Service
            $table->unsignedBigInteger('variant_id')->index(); // Tham chiếu Catalog Service
            $table->string('product_name');
            $table->json('variant_attributes')->nullable();
            $table->string('sku', 100)->nullable();
            $table->string('image')->nullable();
            $table->decimal('unit_price', 12, 2);
            $table->unsignedInteger('quantity');
            $table->decimal('subtotal', 12, 2);
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
    }
};
