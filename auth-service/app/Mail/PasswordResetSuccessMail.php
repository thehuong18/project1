<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class PasswordResetSuccessMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public string $temporaryPassword, public string $name)
    {
    }

    public function build(): self
    {
        return $this->subject('Mật khẩu mới STRIKER')
            ->html('<p>Xin chào ' . e($this->name) . ',</p><p>Mật khẩu mới của bạn là: <strong>' . e($this->temporaryPassword) . '</strong></p><p>Vui lòng đổi mật khẩu sau khi đăng nhập.</p>');
    }
}
