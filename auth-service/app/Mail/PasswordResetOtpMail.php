<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class PasswordResetOtpMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public string $otp, public string $name)
    {
    }

    public function build(): self
    {
        return $this->subject('Mã OTP đặt lại mật khẩu STRIKER')
            ->html('<p>Xin chào ' . e($this->name) . ',</p><p>Mã OTP đặt lại mật khẩu của bạn là: <strong>' . e($this->otp) . '</strong></p><p>Mã này có hiệu lực trong 10 phút.</p>');
    }
}
