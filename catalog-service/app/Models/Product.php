<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'category_id', 'brand_id', 'name', 'slug', 'sku', 'brand', 'tag',
        'description', 'price', 'old_price', 'stock', 'image_url', 'images',
        'colors', 'sizes', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'float',
            'old_price' => 'float',
            'stock' => 'integer',
            'images' => 'array',
            'colors' => 'array',
            'sizes' => 'array',
            'is_active' => 'boolean',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function brandModel(): BelongsTo
    {
        return $this->belongsTo(Brand::class, 'brand_id');
    }

    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class);
    }

    public function productImages(): HasMany
    {
        return $this->hasMany(ProductImage::class)->orderBy('sort_order');
    }
}