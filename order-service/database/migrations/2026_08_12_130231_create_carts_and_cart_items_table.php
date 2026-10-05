<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// 8. create_carts_and_cart_items_table.php

return new class extends Migration {
    public function up(): void
    {
        Schema::create('carts', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->unique();

            $table->timestamps();
        });

        Schema::create('cart_items', function (Blueprint $table) {
            $table->id();

            $table->foreignId('cart_id')->constrained('carts')->onDelete('cascade');
            $table->unsignedBigInteger('product_id')->index(); // Tham chiếu Catalog Service
            $table->unsignedBigInteger('variant_id')->index(); // Tham chiếu Catalog Service
            $table->unsignedInteger('quantity')->default(1);
            $table->timestamps();

            $table->unique(['cart_id', 'variant_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cart_items');
        Schema::dropIfExists('carts');
    }
};