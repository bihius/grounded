<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Question extends Model
{
    protected $fillable = [
        'question',
        'answer',
        'status',
        'rating',
        'feedback',
    ];

    protected function casts(): array
    {
        return [
            'rating' => 'integer',
        ];
    }
}
