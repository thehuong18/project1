<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('order_id')->unique(); // Tham chiếu Order Service
            $table->string('payment_method', 30);
            $table->decimal('amount', 12, 2);
            $table->string('status', 30)->default('pending')->index();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
        });

        Schema::create('payment_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payment_id')->constrained('payments')->onDelete('cascade');
            $table->string('gateway', 30);
            $table->string('transaction_code', 100)->nullable()->index();
            $table->string('response_code', 20)->nullable();
            $table->decimal('amount', 12, 2);
            $table->string('status', 30);
            $table->json('raw_payload')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('payment_transactions');
        Schema::dropIfExists('payments');
    }
};