<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\CompanyBalanceController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Reparto\CashSessionController;
use App\Http\Controllers\Reparto\DeliveryOrderController;
use App\Http\Controllers\Reparto\ManualCaptureController;
use App\Http\Controllers\Reparto\ManualCaptureSessionController;
use App\Http\Controllers\Reparto\RepartoController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\SettingsController;
use App\Http\Controllers\Settings\UserController;
use App\Models\CashSession;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    if (! auth()->check()) {
        return redirect()->route('login');
    }

    // Con jornada abierta se entra directo a la pantalla de jornada en curso
    return CashSession::openLiveForUser(auth()->id())
        ? redirect()->route('reparto.index')
        : redirect()->route('dashboard');
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
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

    Route::prefix('cuenta-empresa')->name('company-balance.')->group(function () {
        Route::get('/', [CompanyBalanceController::class, 'index'])->name('index');
        Route::post('/saldo', [CompanyBalanceController::class, 'storeEntry'])->name('entry.store');
        Route::put('/saldo/{movement}', [CompanyBalanceController::class, 'updateEntry'])->name('entry.update');
        Route::put('/movimientos/{movement}', [CompanyBalanceController::class, 'updateMovement'])->name('movement.update');
        Route::put('/movimientos/{movement}/saldo-resultante', [CompanyBalanceController::class, 'correctBalanceAfter'])->name('movement.correct-balance');
        Route::post('/ajustar', [CompanyBalanceController::class, 'adjustBalance'])->name('adjust');
        Route::post('/liquidar', [CompanyBalanceController::class, 'liquidate'])->name('liquidate');
    });

    Route::prefix('captura-manual')->name('manual-capture.')->group(function () {
        Route::get('/', [ManualCaptureController::class, 'index'])->name('index');
        Route::post('/sesion', [ManualCaptureSessionController::class, 'store'])->name('session.store');
        Route::get('/jornada/{session}', [ManualCaptureController::class, 'edit'])->name('edit');
        Route::post('/jornada/{session}/cerrar', [ManualCaptureSessionController::class, 'close'])->name('session.close');
        Route::post('/jornada/{session}/pedidos', [ManualCaptureController::class, 'storeEntry'])->name('entries.store');
        Route::put('/jornada/{session}/pedidos/{order}', [ManualCaptureController::class, 'updateEntry'])->name('entries.update');
        Route::delete('/jornada/{session}/pedidos/{order}', [ManualCaptureController::class, 'destroyEntry'])->name('entries.destroy');
    });

    Route::prefix('reparto')->name('reparto.')->group(function () {
        Route::get('/', [RepartoController::class, 'index'])->name('index');
        Route::post('/caja', [CashSessionController::class, 'store'])->name('caja.store');
        Route::post('/caja/cerrar', [CashSessionController::class, 'close'])->name('caja.close');
        Route::post('/pedidos/iniciar', [DeliveryOrderController::class, 'start'])->name('orders.start');
        Route::get('/pedidos/{order}', [DeliveryOrderController::class, 'show'])->name('orders.show');
        Route::get('/pedidos/{order}/editar', [DeliveryOrderController::class, 'edit'])->name('orders.edit');
        Route::put('/pedidos/{order}', [DeliveryOrderController::class, 'update'])->name('orders.update');
        Route::put('/pedidos/{order}/actualizar', [DeliveryOrderController::class, 'updateCompleted'])->name('orders.update-completed');
        Route::post('/pedidos/{order}/finalizar', [DeliveryOrderController::class, 'complete'])->name('orders.complete');
        Route::post('/pedidos/{order}/cancelar', [DeliveryOrderController::class, 'cancel'])->name('orders.cancel');
    });

    Route::prefix('settings')->name('settings.')->group(function () {
        Route::get('/', [SettingsController::class, 'index'])->name('index');
        Route::get('/users', [UserController::class, 'index'])->name('users');
        Route::get('/profile', [ProfileController::class, 'index'])->name('profile');
        Route::put('/profile', [ProfileController::class, 'update'])->name('profile.update');
        Route::put('/profile/password', [ProfileController::class, 'updatePassword'])->name('profile.password');
    });
});

Route::get('/welcome', function () {
    return view('welcome');
});
