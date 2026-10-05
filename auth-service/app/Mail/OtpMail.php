<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class OtpMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public string $otp)
    {
    }

    public function build(): self
    {
        return $this->subject('Mã OTP xác thực tài khoản STRIKER')
            ->html('<p>Xin chào,</p><p>Mã OTP xác thực tài khoản của bạn là: <strong>' . e($this->otp) . '</strong></p><p>Mã này có hiệu lực trong 10 phút.</p>');
    }
}
