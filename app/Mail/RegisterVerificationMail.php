<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class RegisterVerificationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $verificationUrl,
        public int $expiresMinutes,
        public string $userName,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Verifica tu correo — '.config('app.name'),
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.register-verification',
        );
    }
}
