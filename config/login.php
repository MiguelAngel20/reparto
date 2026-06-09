<?php

return [

    'verification_code_expires' => (int) env('LOGIN_VERIFICATION_CODE_EXPIRES', 10),

    'verification_max_attempts' => (int) env('LOGIN_VERIFICATION_MAX_ATTEMPTS', 5),

    'email_verification_expires' => (int) env('EMAIL_VERIFICATION_EXPIRES', 60),

];
