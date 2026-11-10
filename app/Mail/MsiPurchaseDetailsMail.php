<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class MsiPurchaseDetailsMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param  array{
     *     account_name: string,
     *     purchase_name: string,
     *     original_amount: float,
     *     monthly_amount: float,
     *     months_total: int,
     *     first_due_date_formatted: string,
     *     installments: list<array{
     *         number: int,
     *         due_date_formatted: string,
     *         amount: float,
     *         paid: bool,
     *         paid_at_formatted: ?string
     *     }>
     * }  $details
     */
    public function __construct(
        public array $details,
        public string $senderName,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Detalle MSI — '.$this->details['purchase_name'].' — '.config('app.name'),
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.msi-purchase-details',
        );
    }
}
