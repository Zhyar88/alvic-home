/*
  # Seed Default Administrator User

  Creates the initial admin account for first login.

  - Email: admin@alvichome.com
  - Password: Admin123!
  - Role: Administrator (full permissions)
*/

DO $$
DECLARE
  v_user_id uuid := gen_random_uuid();
  v_exists boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'admin@alvichome.com') INTO v_exists;

  IF NOT v_exists THEN
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      role,
      aud,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      confirmation_token,
      recovery_token
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'admin@alvichome.com',
      crypt('Admin123!', gen_salt('bf')),
      now(),
      'authenticated',
      'authenticated',
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      false,
      '',
      ''
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      provider_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      v_user_id::text,
      jsonb_build_object('sub', v_user_id::text, 'email', 'admin@alvichome.com'),
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO user_profiles (
      id,
      user_id,
      full_name_en,
      full_name_ku,
      role,
      is_active
    ) VALUES (
      v_user_id,
      v_user_id,
      'System Administrator',
      'بەڕێوەبەری سیستەم',
      'administrator',
      true
    );
  END IF;
END $$;
