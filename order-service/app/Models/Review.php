<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Review extends Model
{
    protected $fillable = [
        'order_id',
        'product_id',
        'user_id',
        'user_name',
        'user_avatar',
        'rating',
        'comment',
    ];

    protected function casts(): array
    {
        return [
            'rating' => 'integer',
            'product_id' => 'integer',
            'user_id' => 'integer',
        ];
    }
}
