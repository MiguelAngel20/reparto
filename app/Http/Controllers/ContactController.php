<?php

namespace App\Http\Controllers;

use App\Http\Requests\Contact\StoreContactRequest;
use App\Http\Requests\Contact\UpdateContactRequest;
use App\Models\Contact;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ContactController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('q', ''));

        $contacts = Contact::query()
            ->with('createdBy:id,name')
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($q) use ($search): void {
                    $q->where('name', 'like', '%'.$search.'%')
                        ->orWhere('phone', 'like', '%'.$search.'%')
                        ->orWhere('address', 'like', '%'.$search.'%');
                });
            })
            ->orderBy('name')
            ->get()
            ->map(fn (Contact $contact) => $this->formatContact($contact));

        return Inertia::render('Contacts/Index', [
            'contacts' => $contacts,
            'search' => $search,
        ]);
    }

    public function show(Contact $contact): Response
    {
        $contact->load('createdBy:id,name');

        return Inertia::render('Contacts/Show', [
            'contact' => $this->formatContact($contact, detailed: true),
        ]);
    }

    public function store(StoreContactRequest $request): RedirectResponse
    {
        $data = [
            'name' => trim($request->validated('name')),
            'phone' => trim($request->validated('phone')),
            'address' => $this->nullableString($request->validated('address')),
            'maps_url' => $this->nullableString($request->validated('maps_url')),
            'created_by_user_id' => $request->user()->id,
        ];

        if ($request->hasFile('image')) {
            $data['image_path'] = $request->file('image')->store('contacts', 'public');
        }

        Contact::query()->create($data);

        return back()->with('success', 'Contacto registrado.');
    }

    public function update(UpdateContactRequest $request, Contact $contact): RedirectResponse
    {
        $data = [
            'name' => trim($request->validated('name')),
            'phone' => trim($request->validated('phone')),
            'address' => $this->nullableString($request->validated('address')),
            'maps_url' => $this->nullableString($request->validated('maps_url')),
        ];

        if ($request->boolean('remove_image') && $contact->image_path) {
            Storage::disk('public')->delete($contact->image_path);
            $data['image_path'] = null;
        }

        if ($request->hasFile('image')) {
            if ($contact->image_path) {
                Storage::disk('public')->delete($contact->image_path);
            }
            $data['image_path'] = $request->file('image')->store('contacts', 'public');
        }

        $contact->update($data);

        return back()->with('success', 'Contacto actualizado.');
    }

    public function destroy(Request $request, Contact $contact): RedirectResponse
    {
        abort_unless($request->user()?->isAdmin(), 403);

        if ($contact->image_path) {
            Storage::disk('public')->delete($contact->image_path);
        }

        $contact->delete();

        return redirect()->route('contacts.index')->with('success', 'Contacto eliminado.');
    }

    /**
     * @return array<string, mixed>
     */
    private function formatContact(Contact $contact, bool $detailed = false): array
    {
        $phoneDigits = preg_replace('/\D+/', '', $contact->phone) ?? '';

        $payload = [
            'id' => $contact->id,
            'name' => $contact->name,
            'initials' => $this->initialsForName($contact->name),
            'phone' => $contact->phone,
            'phone_digits' => $phoneDigits,
            'tel_href' => $phoneDigits !== '' ? 'tel:'.$phoneDigits : null,
            'whatsapp_href' => $phoneDigits !== '' ? 'https://wa.me/'.$phoneDigits : null,
            'address' => $contact->address,
            'maps_url' => $contact->maps_url,
            'image_url' => $contact->image_path
                ? Storage::disk('public')->url($contact->image_path)
                : null,
            'created_by_name' => $contact->createdBy?->name,
            'created_at' => $contact->created_at?->format('d/m/Y H:i'),
        ];

        if ($detailed) {
            $payload['created_by_user_id'] = $contact->created_by_user_id;
        }

        return $payload;
    }

    private function initialsForName(string $name): string
    {
        $parts = preg_split('/\s+/u', trim($name), -1, PREG_SPLIT_NO_EMPTY) ?: [];

        if ($parts === []) {
            return '?';
        }

        if (count($parts) === 1) {
            return mb_strtoupper(mb_substr($parts[0], 0, 2));
        }

        $first = mb_substr($parts[0], 0, 1);
        $second = mb_substr($parts[1], 0, 1);

        return mb_strtoupper($first.$second);
    }

    private function nullableString(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $trimmed = trim($value);

        return $trimmed === '' ? null : $trimmed;
    }
}
