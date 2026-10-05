<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('coupons', function (Blueprint $table) {
            $table->id();

            $table->string('code', 50)->unique();
            $table->string('title')->nullable();
            $table->text('description')->nullable();
            $table->string('type', 20); // fixed / percent
            $table->decimal('value', 12, 2);

            $table->decimal('min_order_amount', 12, 2)->default(0.00);
            $table->decimal('max_discount_amount', 12, 2)->nullable();

            $table->integer('usage_limit')->nullable();
            $table->integer('used_count')->default(0);
            $table->integer('limit_per_user')->default(1);

            $table->boolean('is_active')->default(true)->index();

            $table->timestamp('starts_at')->nullable();
            $table->timestamp('expires_at')->nullable();

            $table->softDeletes();
            $table->timestamps();

            $table->index(['starts_at', 'expires_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('coupons');
    }
};