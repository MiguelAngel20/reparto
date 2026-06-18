<?php

namespace App\Http\Requests\Settings;

use App\Support\UserSection;
use Illuminate\Foundation\Http\FormRequest;

class UpdateUserSectionPermissionsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    public function rules(): array
    {
        $rules = [
            'permissions' => ['required', 'array'],
        ];

        foreach (UserSection::all() as $section) {
            $rules["permissions.{$section}"] = ['required', 'array'];
            $rules["permissions.{$section}.can_view"] = ['required', 'boolean'];

            if (UserSection::isGranular($section)) {
                foreach (UserSection::granularActions($section) as $action) {
                    $rules["permissions.{$section}.can_{$action}"] = ['required', 'boolean'];
                }
            } else {
                $rules["permissions.{$section}.can_edit"] = ['required', 'boolean'];
            }
        }

        return $rules;
    }

    protected function prepareForValidation(): void
    {
        $permissions = $this->input('permissions', []);

        foreach (UserSection::all() as $section) {
            $row = $permissions[$section] ?? [];

            if (UserSection::isGranular($section)) {
                $canView = filter_var($row['can_view'] ?? false, FILTER_VALIDATE_BOOLEAN);
                $normalized = ['can_view' => $canView];

                foreach (UserSection::granularActions($section) as $action) {
                    $value = filter_var($row['can_'.$action] ?? false, FILTER_VALIDATE_BOOLEAN);
                    $normalized['can_'.$action] = $value;
                    if ($value) {
                        $normalized['can_view'] = true;
                    }
                }

                $permissions[$section] = $normalized;
                continue;
            }

            $canEdit = filter_var($row['can_edit'] ?? false, FILTER_VALIDATE_BOOLEAN);
            $canView = filter_var($row['can_view'] ?? false, FILTER_VALIDATE_BOOLEAN);

            if ($canEdit) {
                $canView = true;
            }

            $permissions[$section] = [
                'can_view' => $canView,
                'can_edit' => $canEdit,
            ];
        }

        $this->merge(['permissions' => $permissions]);
    }
}
