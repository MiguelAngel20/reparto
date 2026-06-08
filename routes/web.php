<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Reparto\CashSessionController;
use App\Http\Controllers\Reparto\DeliveryOrderController;
use App\Http\Controllers\Reparto\ManualCaptureController;
use App\Http\Controllers\Reparto\ManualCaptureSessionController;
use App\Http\Controllers\Reparto\RepartoController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\SettingsController;
use App\Http\Controllers\Settings\UserController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return auth()->check()
        ? redirect()->route('dashboard')
        : redirect()->route('login');
});

Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'showLoginForm'])->name('login');
    Route::post('/login', [AuthController::class, 'login']);
    Route::get('/register', [AuthController::class, 'showRegisterForm'])->name('register');
    Route::post('/register', [AuthController::class, 'register']);
});

Route::middleware('auth')->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

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
        Route::put('/pedidos/{order}', [DeliveryOrderController::class, 'update'])->name('orders.update');
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
