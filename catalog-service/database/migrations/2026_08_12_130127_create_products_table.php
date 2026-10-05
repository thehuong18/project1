<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();

            $table->foreignId('category_id')->constrained('categories')->onDelete('restrict');
            $table->foreignId('brand_id')->nullable()->constrained('brands')->nullOnDelete();

            $table->string('name');
            $table->string('slug')->unique();
            $table->string('sku', 100)->unique();
            $table->string('brand')->index();
            $table->string('tag', 50)->nullable();
            $table->longText('description')->nullable();

            $table->decimal('price', 12, 2)->default(0);
            $table->decimal('old_price', 12, 2)->nullable();
            $table->unsignedInteger('stock')->default(0);

            $table->longText('image_url')->nullable();
            $table->json('images')->nullable();

            $table->json('colors')->nullable();
            $table->json('sizes')->nullable();

            $table->boolean('is_active')->default(true)->index();

            $table->softDeletes();
            $table->timestamps();

            $table->index(['category_id', 'is_active']);
            $table->index(['brand', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
