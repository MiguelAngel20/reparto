<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\CardAccountController;
use App\Http\Controllers\CompanyBalanceController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\GastoController;
use App\Http\Controllers\PersonalServiceController;
use App\Http\Controllers\Reparto\CashSessionController;
use App\Http\Controllers\Reparto\DeliveryOrderController;
use App\Http\Controllers\Reparto\ManualCaptureController;
use App\Http\Controllers\Reparto\ManualCaptureSessionController;
use App\Http\Controllers\Reparto\PersonalServiceSessionController;
use App\Http\Controllers\Reparto\RepartoController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\SettingsController;
use App\Http\Controllers\Settings\UserController;
use App\Http\Controllers\TeamController;
use App\Models\CashSession;
use App\Services\UserSectionPermissionService;
use App\Support\UserSection;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    if (! auth()->check()) {
        return redirect()->route('login');
    }

    return redirect(app(UserSectionPermissionService::class)->defaultLandingUrl(auth()->user()));
});

Route::get('/email/verify/{id}/{hash}', [AuthController::class, 'verifyEmail'])
    ->name('verification.verify');

Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'showLoginForm'])->name('login');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:6,1');

    Route::get('/login/verify', [AuthController::class, 'showVerifyForm'])->name('login.verify');
    Route::post('/login/verify', [AuthController::class, 'verifyLoginCode'])->middleware('throttle:12,1');
    Route::post('/login/resend-code', [AuthController::class, 'resendLoginCode'])->middleware('throttle:3,1');
    Route::post('/login/cancel', [AuthController::class, 'cancelVerification'])->name('login.cancel');

    Route::get('/register', [AuthController::class, 'showRegisterForm'])->name('register');
    Route::post('/register', [AuthController::class, 'register']);
});

Route::middleware('auth')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

    Route::get('/dashboard', [DashboardController::class, 'index'])
        ->middleware('section:'.UserSection::DASHBOARD.',view')
        ->name('dashboard');

    Route::get('/equipo', [TeamController::class, 'index'])->name('team.index');

    Route::prefix('gasto')->name('gasto.')->middleware('section:'.UserSection::GASTO.',view')->group(function () {
        Route::get('/', [GastoController::class, 'index'])->name('index');
        Route::middleware('section:'.UserSection::GASTO.',edit')->group(function () {
            Route::post('/', [GastoController::class, 'store'])->name('store');
            Route::put('/{expense}', [GastoController::class, 'update'])->name('update');
            Route::delete('/{expense}', [GastoController::class, 'destroy'])->name('destroy');
        });
    });

    Route::prefix('mis-servicios')->name('personal-service.')->middleware('section:'.UserSection::PERSONAL_SERVICE.',view')->group(function () {
        Route::get('/', [PersonalServiceController::class, 'index'])->name('index');
        Route::middleware('section:'.UserSection::PERSONAL_SERVICE.',edit')->group(function () {
            Route::post('/', [PersonalServiceController::class, 'store'])->name('store');
            Route::put('/{service}', [PersonalServiceController::class, 'update'])->name('update');
            Route::delete('/{service}', [PersonalServiceController::class, 'destroy'])->name('destroy');
        });
    });

    Route::prefix('cuenta-tarjeta')->name('card-account.')->middleware('section:'.UserSection::CARD_ACCOUNT.',view')->group(function () {
        Route::get('/', [CardAccountController::class, 'index'])->name('index');
        Route::get('/{account}', [CardAccountController::class, 'show'])->name('show');
        Route::middleware('section:'.UserSection::CARD_ACCOUNT.',create')->group(function () {
            Route::post('/', [CardAccountController::class, 'store'])->name('store');
            Route::post('/{account}/compras', [CardAccountController::class, 'storePurchase'])->name('purchases.store');
        });
        Route::post('/{account}/abonos', [CardAccountController::class, 'storePayment'])
            ->middleware('section:'.UserSection::CARD_ACCOUNT.',payment')
            ->name('payments.store');
        Route::post('/{account}/deposito-real', [CardAccountController::class, 'storeRealDeposit'])
            ->middleware('section:'.UserSection::CARD_ACCOUNT.',real_deposit')
            ->name('real-deposits.store');
        Route::put('/{account}', [CardAccountController::class, 'update'])
            ->middleware('section:'.UserSection::CARD_ACCOUNT.',update')
            ->name('update');
        Route::put('/{account}/movimientos/{movement}', [CardAccountController::class, 'updateMovement'])
            ->middleware('section:'.UserSection::CARD_ACCOUNT.',update')
            ->name('movements.update');
        Route::delete('/{account}/movimientos/{movement}', [CardAccountController::class, 'destroyMovement'])
            ->middleware('section:'.UserSection::CARD_ACCOUNT.',delete')
            ->name('movements.destroy');
    });

    Route::prefix('cuenta-empresa')->name('company-balance.')->middleware('section:'.UserSection::COMPANY_BALANCE.',view')->group(function () {
        Route::get('/', [CompanyBalanceController::class, 'index'])->name('index');
        Route::middleware('section:'.UserSection::COMPANY_BALANCE.',edit')->group(function () {
            Route::post('/saldo', [CompanyBalanceController::class, 'storeEntry'])->name('entry.store');
            Route::put('/saldo/{movement}', [CompanyBalanceController::class, 'updateEntry'])->name('entry.update');
            Route::put('/movimientos/{movement}', [CompanyBalanceController::class, 'updateMovement'])->name('movement.update');
            Route::put('/movimientos/{movement}/saldo-resultante', [CompanyBalanceController::class, 'correctBalanceAfter'])->name('movement.correct-balance');
            Route::post('/ajustar', [CompanyBalanceController::class, 'adjustBalance'])->name('adjust');
            Route::post('/liquidar', [CompanyBalanceController::class, 'liquidate'])->name('liquidate');
        });
    });

    Route::prefix('captura-manual')->name('manual-capture.')->middleware('section:'.UserSection::MANUAL_CAPTURE.',view')->group(function () {
        Route::get('/', [ManualCaptureController::class, 'index'])->name('index');
        Route::get('/jornada/{session}/ver', [ManualCaptureController::class, 'show'])->name('show');
        Route::get('/jornada/{session}', [ManualCaptureController::class, 'edit'])->name('edit');
        Route::middleware('section:'.UserSection::MANUAL_CAPTURE.',edit')->group(function () {
            Route::post('/sesion', [ManualCaptureSessionController::class, 'store'])->name('session.store');
            Route::post('/jornada/{session}/cerrar', [ManualCaptureSessionController::class, 'close'])->name('session.close');
            Route::post('/jornada/{session}/pedidos', [ManualCaptureController::class, 'storeEntry'])->name('entries.store');
            Route::put('/jornada/{session}/pedidos/{order}', [ManualCaptureController::class, 'updateEntry'])->name('entries.update');
            Route::delete('/jornada/{session}/pedidos/{order}', [ManualCaptureController::class, 'destroyEntry'])->name('entries.destroy');
            Route::delete('/jornada/{session}', [ManualCaptureController::class, 'destroySession'])->name('session.destroy');
        });
    });

    Route::prefix('reparto')->name('reparto.')->middleware('section:'.UserSection::REPARTO.',view')->group(function () {
        Route::get('/', [RepartoController::class, 'index'])->name('index');
        Route::get('/jornada/{session}', [RepartoController::class, 'showSession'])->name('session.show');
        Route::get('/jornada/{session}/editar', [RepartoController::class, 'editSession'])->name('session.edit');
        Route::get('/pedidos/{order}', [DeliveryOrderController::class, 'show'])->name('orders.show');
        Route::get('/pedidos/{order}/editar', [DeliveryOrderController::class, 'edit'])->name('orders.edit');
        Route::middleware('section:'.UserSection::REPARTO.',edit')->group(function () {
            Route::post('/caja', [CashSessionController::class, 'store'])->name('caja.store');
            Route::post('/caja/cerrar', [CashSessionController::class, 'close'])->name('caja.close');
            Route::delete('/jornada/{session}', [RepartoController::class, 'destroySession'])->name('session.destroy');
            Route::put('/jornada/{session}/pedidos/{order}', [RepartoController::class, 'updateSessionEntry'])->name('session.entries.update');
            Route::delete('/jornada/{session}/pedidos/{order}', [RepartoController::class, 'destroySessionEntry'])->name('session.entries.destroy');
            Route::middleware('section:'.UserSection::GASTO.',edit')->group(function () {
                Route::put('/jornada/{session}/gastos/{expense}', [RepartoController::class, 'updateSessionExpense'])->name('session.expenses.update');
                Route::delete('/jornada/{session}/gastos/{expense}', [RepartoController::class, 'destroySessionExpense'])->name('session.expenses.destroy');
            });
            Route::middleware('section:'.UserSection::PERSONAL_SERVICE.',edit')->group(function () {
                Route::put('/jornada/{session}/servicios-propios/{service}', [RepartoController::class, 'updateSessionPersonalService'])->name('session.personal-services.update');
                Route::delete('/jornada/{session}/servicios-propios/{service}', [RepartoController::class, 'destroySessionPersonalService'])->name('session.personal-services.destroy');
            });
            Route::post('/pedidos/iniciar', [DeliveryOrderController::class, 'start'])->name('orders.start');
            Route::put('/pedidos/{order}', [DeliveryOrderController::class, 'update'])->name('orders.update');
            Route::put('/pedidos/{order}/actualizar', [DeliveryOrderController::class, 'updateCompleted'])->name('orders.update-completed');
            Route::post('/pedidos/{order}/finalizar', [DeliveryOrderController::class, 'complete'])->name('orders.complete');
            Route::post('/pedidos/{order}/cancelar', [DeliveryOrderController::class, 'cancel'])->name('orders.cancel');
        });

        Route::middleware('section:'.UserSection::PERSONAL_SERVICE.',view')->group(function () {
            Route::get('/servicios-propios/{service}', [PersonalServiceSessionController::class, 'show'])->name('personal-services.show');
        });

        Route::middleware('section:'.UserSection::PERSONAL_SERVICE.',edit')->group(function () {
            Route::post('/servicios-propios/iniciar', [PersonalServiceSessionController::class, 'start'])->name('personal-services.start');
            Route::put('/servicios-propios/{service}', [PersonalServiceSessionController::class, 'update'])->name('personal-services.update');
            Route::post('/servicios-propios/{service}/finalizar', [PersonalServiceSessionController::class, 'complete'])->name('personal-services.complete');
            Route::post('/servicios-propios/{service}/cancelar', [PersonalServiceSessionController::class, 'cancel'])->name('personal-services.cancel');
        });
    });

    Route::prefix('settings')->name('settings.')->group(function () {
        Route::get('/', [SettingsController::class, 'index'])->name('index');
        Route::get('/users', [UserController::class, 'index'])->name('users');
        Route::get('/users/{user}/permisos', [UserController::class, 'editPermissions'])->name('users.permissions');
        Route::put('/users/{user}/permisos', [UserController::class, 'updatePermissions'])->name('users.permissions.update');
        Route::get('/profile', [ProfileController::class, 'index'])->name('profile');
        Route::put('/profile', [ProfileController::class, 'update'])->name('profile.update');
        Route::put('/profile/password', [ProfileController::class, 'updatePassword'])->name('profile.password');
    });
});

Route::get('/welcome', function () {
    return view('welcome');
});
