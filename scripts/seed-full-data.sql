-- =============================================================================
-- seed-full-data.sql
-- Datos de prueba completos para kombat-id
--
-- Genera:
--   • 100 academias distribuidas en las regiones de Chile
--   • 100 instructores (1 por academia) → auth.users + practitioners + user_roles
--   • 2.000 alumnos (20 por academia)   → auth.users + practitioners + user_roles
--   • 2.100 academy_memberships
--   • 2.000 discipline_grades (1 por alumno)
--
-- Contraseña para todos los usuarios: Kombat2026
--
-- Prerrequisitos:
--   1. Extensión pgcrypto activa (ya incluida en Supabase por defecto)
--   2. Al menos un registro en admin_users → el script usa el primero encontrado
--   3. Roles "instructor" y "alumno" en la tabla public.roles
--
-- Ejecución:
--   • Supabase Dashboard → SQL Editor → pegar y ejecutar
--   • O via psql: psql $DATABASE_URL -f seed-full-data.sql
--
-- ADVERTENCIA: Este script inserta ~2.100 usuarios en auth.users.
--              No ejecutar en producción.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. Extensión y variables de configuración
-- ---------------------------------------------------------------------------

-- Aseguramos pgcrypto (necesario para gen_salt y crypt)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Variable de sesión con el admin_id (se sobreescribe con el primer admin real)
DO $$
DECLARE
  v_admin_id UUID;
BEGIN
  SELECT user_id INTO v_admin_id FROM admin_users LIMIT 1;
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró ningún admin en admin_users. Ejecuta primero el script de creación de admin.';
  END IF;
  -- Guardamos en configuración de sesión para uso en bloques posteriores
  PERFORM set_config('app.seed_admin_id', v_admin_id::TEXT, TRUE);
END;
$$;

-- ---------------------------------------------------------------------------
-- 1. Tablas temporales de apoyo
-- ---------------------------------------------------------------------------

-- Pool de nombres masculinos
CREATE TEMP TABLE IF NOT EXISTS _seed_names_m (name TEXT) ON COMMIT DROP;
INSERT INTO _seed_names_m VALUES
  ('Alejandro'),('Andrés'),('Bastián'),('Carlos'),('Cristóbal'),
  ('Daniel'),('Diego'),('Eduardo'),('Felipe'),('Francisco'),
  ('Gabriel'),('Gonzalo'),('Ignacio'),('Javier'),('Jorge'),
  ('José'),('Juan'),('Leonardo'),('Luis'),('Mateo'),
  ('Matías'),('Miguel'),('Nicolás'),('Pablo'),('Pedro'),
  ('Rafael'),('Ricardo'),('Roberto'),('Rodrigo'),('Sebastián'),
  ('Tomás'),('Vicente'),('Víctor');

-- Pool de nombres femeninos
CREATE TEMP TABLE IF NOT EXISTS _seed_names_f (name TEXT) ON COMMIT DROP;
INSERT INTO _seed_names_f VALUES
  ('Alejandra'),('Amanda'),('Ana'),('Bárbara'),('Camila'),
  ('Carolina'),('Catalina'),('Claudia'),('Constanza'),('Daniela'),
  ('Fernanda'),('Francisca'),('Gabriela'),('Isidora'),('Javiera'),
  ('Jessica'),('Josefina'),('Karen'),('Laura'),('Lucía'),
  ('Macarena'),('María'),('Martina'),('Natalia'),('Nicole'),
  ('Paula'),('Sofía'),('Valentina'),('Valeria');

-- Pool de apellidos
CREATE TEMP TABLE IF NOT EXISTS _seed_lastnames (name TEXT) ON COMMIT DROP;
INSERT INTO _seed_lastnames VALUES
  ('Aguilera'),('Araya'),('Bravo'),('Cáceres'),('Castro'),
  ('Contreras'),('Cortés'),('Díaz'),('Espinoza'),('Fernández'),
  ('Flores'),('Fuentes'),('García'),('Gómez'),('González'),
  ('Gutiérrez'),('Hernández'),('Herrera'),('Lagos'),('López'),
  ('Martínez'),('Medina'),('Mendoza'),('Miranda'),('Molina'),
  ('Morales'),('Muñoz'),('Navarro'),('Núñez'),('Ojeda'),
  ('Ortiz'),('Parra'),('Pérez'),('Ramírez'),('Reyes'),
  ('Rivera'),('Rojas'),('Romero'),('Ruiz'),('Sánchez'),
  ('Silva'),('Soto'),('Torres'),('Vargas'),('Vásquez'),
  ('Vega'),('Vera'),('Zamora');

-- Pool de calles
CREATE TEMP TABLE IF NOT EXISTS _seed_streets (name TEXT) ON COMMIT DROP;
INSERT INTO _seed_streets VALUES
  ('Av. Libertador Bernardo O''Higgins'),('Calle Los Aromos'),
  ('Av. Principal'),('Av. Los Leones'),('Calle San Martín'),
  ('Av. Providencia'),('Av. Independencia'),('Calle O''Higgins'),
  ('Av. Balmaceda'),('Pasaje Las Flores'),('Av. Arturo Prat'),
  ('Calle Colón'),('Av. Manuel Montt'),('Calle Serrano'),
  ('Av. Vicuña Mackenna');

-- Distribución de regiones y ciudades
CREATE TEMP TABLE IF NOT EXISTS _seed_regions (
  region TEXT,
  academy_count INT,
  cities TEXT[]
) ON COMMIT DROP;

INSERT INTO _seed_regions VALUES
  ('metropolitana',      28, ARRAY['Santiago','Maipú','La Florida','Puente Alto','Las Condes','Ñuñoa','Providencia','San Bernardo','Peñalolén','Quilicura']),
  ('valparaiso',         12, ARRAY['Valparaíso','Viña del Mar','Quilpué','Villa Alemana','San Antonio','Los Andes']),
  ('biobio',             10, ARRAY['Concepción','Talcahuano','Los Ángeles','Chillán','Coronel']),
  ('araucania',           7, ARRAY['Temuco','Villarrica','Pucón','Angol','Victoria']),
  ('maule',               7, ARRAY['Talca','Curicó','Linares','Constitución','Cauquenes']),
  ('coquimbo',            6, ARRAY['La Serena','Coquimbo','Ovalle','Illapel']),
  ('ohiggins',            6, ARRAY['Rancagua','San Fernando','Pichilemu','Rengo']),
  ('los_lagos',           5, ARRAY['Puerto Montt','Osorno','Castro','Ancud']),
  ('antofagasta',         4, ARRAY['Antofagasta','Calama','Tocopilla']),
  ('tarapaca',            3, ARRAY['Iquique','Alto Hospicio']),
  ('atacama',             3, ARRAY['Copiapó','Vallenar','Chañaral']),
  ('nuble',               2, ARRAY['Chillán','San Carlos']),
  ('los_rios',            2, ARRAY['Valdivia','La Unión']),
  ('arica_y_parinacota',  2, ARRAY['Arica','Putre']),
  ('aysen',               2, ARRAY['Coyhaique','Puerto Aysén']),
  ('magallanes',          1, ARRAY['Punta Arenas']);

-- Disciplinas disponibles
CREATE TEMP TABLE IF NOT EXISTS _seed_disciplines (discipline TEXT) ON COMMIT DROP;
INSERT INTO _seed_disciplines VALUES
  ('kombat_taekwondo'),('taekwondo_wtf'),('hapkido'),('kick_boxing'),('defensa_personal');

-- Grados con pesos para distribución aleatoria
CREATE TEMP TABLE IF NOT EXISTS _seed_grades (grade TEXT, weight INT) ON COMMIT DROP;
INSERT INTO _seed_grades VALUES
  ('white', 30),('yellow', 25),('green', 20),('blue', 12),('red', 8),('black', 5);

-- Función auxiliar: selecciona elemento aleatorio de un array de texto
CREATE OR REPLACE FUNCTION _seed_pick_from_array(arr TEXT[]) RETURNS TEXT AS $$
BEGIN
  RETURN arr[1 + floor(random() * array_length(arr, 1))::INT];
END;
$$ LANGUAGE plpgsql;

-- Función auxiliar: selecciona grado con distribución ponderada
CREATE OR REPLACE FUNCTION _seed_pick_grade(student_mode BOOLEAN DEFAULT TRUE) RETURNS TEXT AS $$
DECLARE
  v_grade TEXT;
  v_total INT := 100;
  v_rand  INT;
BEGIN
  v_rand := floor(random() * v_total)::INT;
  IF student_mode THEN
    -- white:30, yellow:25, green:20, blue:12, red:8, black:5
    v_grade := CASE
      WHEN v_rand < 30 THEN 'white'
      WHEN v_rand < 55 THEN 'yellow'
      WHEN v_rand < 75 THEN 'green'
      WHEN v_rand < 87 THEN 'blue'
      WHEN v_rand < 95 THEN 'red'
      ELSE 'black'
    END;
  ELSE
    -- instructores: blue:20, red:30, black:50
    v_grade := CASE
      WHEN v_rand < 20 THEN 'blue'
      WHEN v_rand < 50 THEN 'red'
      ELSE 'black'
    END;
  END IF;
  RETURN v_grade;
END;
$$ LANGUAGE plpgsql;

-- Función auxiliar: genera RUT chileno con dígito verificador
CREATE OR REPLACE FUNCTION _seed_generate_rut(n INT) RETURNS TEXT AS $$
DECLARE
  num    BIGINT := 5000000 + n;
  digits INT[];
  s      TEXT   := num::TEXT;
  i      INT;
  j      INT    := 0;
  sum    INT    := 0;
  factors INT[] := ARRAY[2,3,4,5,6,7];
  rem    INT;
  dv     TEXT;
BEGIN
  -- Invertir dígitos
  FOR i IN REVERSE length(s)..1 LOOP
    digits := digits || ARRAY[substring(s, i, 1)::INT];
  END LOOP;
  FOR i IN 1..array_length(digits, 1) LOOP
    sum := sum + digits[i] * factors[((i-1) % 6) + 1];
  END LOOP;
  rem := 11 - (sum % 11);
  dv := CASE
    WHEN rem = 11 THEN '0'
    WHEN rem = 10 THEN 'K'
    ELSE rem::TEXT
  END;
  RETURN num::TEXT || '-' || dv;
END;
$$ LANGUAGE plpgsql;

-- Función auxiliar: nombre slugificado para email (sin tildes, lowercase)
CREATE OR REPLACE FUNCTION _seed_slugify(txt TEXT) RETURNS TEXT AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      translate(txt,
        'áéíóúüñÁÉÍÓÚÜÑàèìòùÀÈÌÒÙâêîôûÂÊÎÔÛãõÃÕ',
        'aeiouunAEIOUUNaeiouAEIOUaeiouAEIOUaoAO'
      ),
      '[^a-z0-9]+', '.', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- 2. Tabla temporal de tracking del seed
-- ---------------------------------------------------------------------------

CREATE TEMP TABLE _seed_instructors (
  seq          INT,
  auth_user_id UUID,
  practitioner_id UUID,
  region       TEXT,
  city         TEXT,
  full_name    TEXT,
  email        TEXT
) ON COMMIT DROP;

CREATE TEMP TABLE _seed_academies (
  seq             INT,
  academy_id      UUID,
  instructor_pid  UUID,
  region          TEXT,
  city            TEXT
) ON COMMIT DROP;

CREATE TEMP TABLE _seed_students (
  seq             INT,
  auth_user_id    UUID,
  practitioner_id UUID,
  academy_id      UUID,
  discipline      TEXT,
  grade           TEXT,
  dan             INT,
  start_year      INT
) ON COMMIT DROP;

-- ---------------------------------------------------------------------------
-- 3. Crear instructores (auth.users + practitioners)
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  rec          RECORD;
  v_seq        INT := 1;
  v_gender     TEXT;
  v_first      TEXT;
  v_last1      TEXT;
  v_last2      TEXT;
  v_full_name  TEXT;
  v_email      TEXT;
  v_grade      TEXT;
  v_dan        INT;
  v_birth_year INT;
  v_start_year INT;
  v_city       TEXT;
  v_rut        TEXT;
  v_auth_id    UUID;
  v_pract_id   UUID;
  v_i          INT;
  v_pwd_hash   TEXT;
BEGIN
  v_pwd_hash := crypt('Kombat2026', gen_salt('bf', 10));

  FOR rec IN SELECT region, academy_count, cities FROM _seed_regions ORDER BY region LOOP
    FOR v_i IN 1..rec.academy_count LOOP

      -- Género (70% masculino)
      v_gender := CASE WHEN random() < 0.7 THEN 'male' ELSE 'female' END;

      -- Nombre
      IF v_gender = 'male' THEN
        SELECT name INTO v_first FROM _seed_names_m ORDER BY random() LIMIT 1;
      ELSE
        SELECT name INTO v_first FROM _seed_names_f ORDER BY random() LIMIT 1;
      END IF;
      SELECT name INTO v_last1 FROM _seed_lastnames ORDER BY random() LIMIT 1;
      SELECT name INTO v_last2 FROM _seed_lastnames ORDER BY random() LIMIT 1;
      v_full_name := v_first || ' ' || v_last1 || ' ' || v_last2;

      -- Email
      v_email := 'instructor' || lpad(v_seq::TEXT, 3, '0') || '.'
               || _seed_slugify(v_first) || '.' || _seed_slugify(v_last1)
               || '@kombat-seed.cl';

      -- Grado (instructores: blue/red/black)
      v_grade := _seed_pick_grade(FALSE);
      v_dan   := CASE WHEN v_grade = 'black' THEN 1 + floor(random() * 5)::INT ELSE NULL END;

      -- Fechas
      v_birth_year := 1975 + floor(random() * 21)::INT;
      v_start_year := 1995 + floor(random() * 21)::INT;

      -- Ciudad
      v_city := rec.cities[1 + floor(random() * array_length(rec.cities, 1))::INT];

      -- RUT
      v_rut := _seed_generate_rut(v_seq);

      -- ── auth.users ─────────────────────────────────────────────────────
      v_auth_id := gen_random_uuid();
      INSERT INTO auth.users (
        id, instance_id, aud, role,
        email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_user_meta_data,
        is_super_admin, is_sso_user, is_anonymous
      ) VALUES (
        v_auth_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        v_email,
        v_pwd_hash,
        NOW(), NOW(), NOW(),
        jsonb_build_object('full_name', v_full_name),
        FALSE, FALSE, FALSE
      );

      -- ── practitioners ──────────────────────────────────────────────────
      v_pract_id := gen_random_uuid();
      INSERT INTO practitioners (
        id, auth_user_id, full_name, rut, role, grade, dan,
        birth_date, start_date, gender, martial_art, is_active,
        address_region, address_city, address_street,
        contact_email, weight_kg, height_cm, qr_token
      ) VALUES (
        v_pract_id, v_auth_id, v_full_name, v_rut,
        'instructor', v_grade, v_dan,
        make_date(v_birth_year, 1 + floor(random()*12)::INT, 1 + floor(random()*27)::INT),
        make_date(v_start_year, 1 + floor(random()*12)::INT, 1 + floor(random()*27)::INT),
        v_gender,
        (SELECT discipline FROM _seed_disciplines ORDER BY random() LIMIT 1),
        TRUE,
        rec.region, v_city,
        (SELECT name FROM _seed_streets ORDER BY random() LIMIT 1) || ' ' || (100 + floor(random()*9900)::INT)::TEXT,
        v_email,
        50 + floor(random()*51)::INT,
        155 + floor(random()*36)::INT,
        gen_random_uuid()
      );

      -- Tracking
      INSERT INTO _seed_instructors VALUES (v_seq, v_auth_id, v_pract_id, rec.region, v_city, v_full_name, v_email);

      v_seq := v_seq + 1;
    END LOOP;
  END LOOP;
END;
$$;

-- user_roles para instructores
INSERT INTO user_roles (user_id, role_name, granted_by)
SELECT
  i.auth_user_id,
  'instructor',
  (current_setting('app.seed_admin_id'))::UUID
FROM _seed_instructors i;

DO $$
DECLARE v_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM _seed_instructors;
  RAISE NOTICE '✓ % instructores creados', v_count;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Crear academias
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  rec         RECORD;
  v_seq       INT := 1;
  v_prefix    TEXT;
  v_suffix    TEXT;
  v_name      TEXT;
  v_city      TEXT;
  v_acad_id   UUID;
  v_prefixes  TEXT[] := ARRAY['Academia','Club','Escuela','Dojo','Centro Deportivo','Instituto'];
  v_suffixes  TEXT[] := ARRAY['Kombat Taekwondo','KT','Taekwondo','TKD','Artes Marciales','Taekwondo WTF','Marcial','Hapkido','Kick Boxing'];
  v_admin_id  UUID   := (current_setting('app.seed_admin_id'))::UUID;
BEGIN
  FOR rec IN SELECT * FROM _seed_instructors ORDER BY seq LOOP

    v_prefix := _seed_pick_from_array(v_prefixes);
    v_suffix := _seed_pick_from_array(v_suffixes);
    v_name   := v_prefix || ' ' || v_suffix || ' ' || rec.city || CASE WHEN rec.seq > 1 THEN ' ' || rec.seq ELSE '' END;

    v_acad_id := gen_random_uuid();

    INSERT INTO academies (
      id, name, region, city, address,
      founded_date, is_active,
      responsible_instructor_ids,
      created_by, contact_email, contact_phone, description
    ) VALUES (
      v_acad_id,
      v_name,
      rec.region,
      rec.city,
      (SELECT name FROM _seed_streets ORDER BY random() LIMIT 1) || ' ' || (100 + floor(random()*9900)::INT)::TEXT,
      make_date(1990 + floor(random()*33)::INT, 1 + floor(random()*12)::INT, 1 + floor(random()*27)::INT),
      TRUE,
      ARRAY[rec.practitioner_id],
      v_admin_id,
      'academia' || lpad(rec.seq::TEXT, 3, '0') || '@kombat-seed.cl',
      '+569' || (10000000 + floor(random()*89999999)::INT)::TEXT,
      'Academia de artes marciales ' || v_suffix || ' ubicada en ' || rec.city || '.'
    );

    INSERT INTO _seed_academies VALUES (rec.seq, v_acad_id, rec.practitioner_id, rec.region, rec.city);

    v_seq := v_seq + 1;
  END LOOP;
END;
$$;

-- Membresías de instructores
INSERT INTO academy_memberships (practitioner_id, academy_id, is_active, joined_at)
SELECT a.instructor_pid, a.academy_id, TRUE, NOW()
FROM _seed_academies a;

DO $$
DECLARE v_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM _seed_academies;
  RAISE NOTICE '✓ % academias creadas', v_count;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Crear alumnos (20 por academia)
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  acad        RECORD;
  v_s         INT;
  v_global_seq INT := 1;
  v_gender    TEXT;
  v_first     TEXT;
  v_last1     TEXT;
  v_last2     TEXT;
  v_full_name TEXT;
  v_email     TEXT;
  v_discipline TEXT;
  v_grade     TEXT;
  v_dan       INT;
  v_birth_year INT;
  v_start_year INT;
  v_rut       TEXT;
  v_auth_id   UUID;
  v_pract_id  UUID;
  v_age_roll  FLOAT;
  v_pwd_hash  TEXT;
  v_admin_id  UUID := (current_setting('app.seed_admin_id'))::UUID;
BEGIN
  v_pwd_hash := crypt('Kombat2026', gen_salt('bf', 10));

  FOR acad IN SELECT * FROM _seed_academies ORDER BY seq LOOP
    FOR v_s IN 1..20 LOOP

      -- Género (55% masculino)
      v_gender := CASE WHEN random() < 0.55 THEN 'male' ELSE 'female' END;

      -- Nombre
      IF v_gender = 'male' THEN
        SELECT name INTO v_first FROM _seed_names_m ORDER BY random() LIMIT 1;
      ELSE
        SELECT name INTO v_first FROM _seed_names_f ORDER BY random() LIMIT 1;
      END IF;
      SELECT name INTO v_last1 FROM _seed_lastnames ORDER BY random() LIMIT 1;
      SELECT name INTO v_last2 FROM _seed_lastnames ORDER BY random() LIMIT 1;
      v_full_name := v_first || ' ' || v_last1 || ' ' || v_last2;

      -- Email
      v_email := 'alumno' || lpad(v_global_seq::TEXT, 4, '0') || '.'
               || _seed_slugify(v_first) || '.' || _seed_slugify(v_last1)
               || '@kombat-seed.cl';

      -- Disciplina y grado
      SELECT discipline INTO v_discipline FROM _seed_disciplines ORDER BY random() LIMIT 1;
      v_grade := _seed_pick_grade(TRUE);
      v_dan   := CASE WHEN v_grade = 'black' THEN 1 + floor(random()*3)::INT ELSE NULL END;

      -- Grupo etario
      v_age_roll := random();
      IF    v_age_roll < 0.15 THEN v_birth_year := 2010 + floor(random()*6)::INT;  -- infantil
      ELSIF v_age_roll < 0.30 THEN v_birth_year := 2005 + floor(random()*5)::INT;  -- juvenil
      ELSIF v_age_roll < 0.85 THEN v_birth_year := 1985 + floor(random()*20)::INT; -- adulto
      ELSE                         v_birth_year := 1960 + floor(random()*25)::INT; -- senior
      END IF;
      v_start_year := GREATEST(v_birth_year + 7, 2005);

      -- RUT (offset 10000 para no colisionar con instructores)
      v_rut := _seed_generate_rut(10000 + v_global_seq);

      -- ── auth.users ─────────────────────────────────────────────────────
      v_auth_id := gen_random_uuid();
      INSERT INTO auth.users (
        id, instance_id, aud, role,
        email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_user_meta_data,
        is_super_admin, is_sso_user, is_anonymous
      ) VALUES (
        v_auth_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        v_email,
        v_pwd_hash,
        NOW(), NOW(), NOW(),
        jsonb_build_object('full_name', v_full_name),
        FALSE, FALSE, FALSE
      );

      -- ── practitioners ──────────────────────────────────────────────────
      v_pract_id := gen_random_uuid();
      INSERT INTO practitioners (
        id, auth_user_id, full_name, rut, role, grade, dan,
        birth_date, start_date, gender, martial_art, is_active,
        address_region, address_city, address_street,
        contact_email, weight_kg, height_cm, qr_token
      ) VALUES (
        v_pract_id, v_auth_id, v_full_name, v_rut,
        'alumno', v_grade, v_dan,
        make_date(v_birth_year, 1 + floor(random()*12)::INT, 1 + floor(random()*27)::INT),
        make_date(v_start_year + floor(random()*(2025 - v_start_year))::INT, 1 + floor(random()*12)::INT, 1 + floor(random()*27)::INT),
        v_gender,
        v_discipline,
        TRUE,
        acad.region, acad.city,
        (SELECT name FROM _seed_streets ORDER BY random() LIMIT 1) || ' ' || (100 + floor(random()*9900)::INT)::TEXT,
        v_email,
        45 + floor(random()*60)::INT,
        145 + floor(random()*50)::INT,
        gen_random_uuid()
      );

      -- Tracking para membresías y discipline_grades
      INSERT INTO _seed_students VALUES (
        v_global_seq, v_auth_id, v_pract_id, acad.academy_id,
        v_discipline, v_grade, v_dan, v_start_year
      );

      v_global_seq := v_global_seq + 1;
    END LOOP;
  END LOOP;
END;
$$;

-- Membresías de alumnos
INSERT INTO academy_memberships (practitioner_id, academy_id, is_active, joined_at)
SELECT s.practitioner_id, s.academy_id, TRUE, NOW()
FROM _seed_students s;

-- user_roles para alumnos
INSERT INTO user_roles (user_id, role_name, granted_by)
SELECT
  s.auth_user_id,
  'alumno',
  (current_setting('app.seed_admin_id'))::UUID
FROM _seed_students s;

DO $$
DECLARE v_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM _seed_students;
  RAISE NOTICE '✓ % alumnos creados', v_count;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. Discipline grades (1 por alumno)
-- ---------------------------------------------------------------------------

INSERT INTO discipline_grades (
  practitioner_id,
  discipline,
  grade,
  dan,
  obtained_at,
  is_active
)
SELECT
  s.practitioner_id,
  s.discipline,
  s.grade,
  s.dan,
  make_date(
    s.start_year + floor(random() * (2025 - s.start_year))::INT,
    1 + floor(random()*12)::INT,
    1 + floor(random()*27)::INT
  ),
  TRUE
FROM _seed_students s;

DO $$
DECLARE v_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM discipline_grades WHERE obtained_at >= CURRENT_DATE - INTERVAL '20 years';
  RAISE NOTICE '✓ % discipline_grades creados', v_count;
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. Resumen final
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_acad  BIGINT;
  v_pract BIGINT;
  v_memb  BIGINT;
  v_grade BIGINT;
  v_roles BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_acad  FROM academies;
  SELECT COUNT(*) INTO v_pract FROM practitioners;
  SELECT COUNT(*) INTO v_memb  FROM academy_memberships;
  SELECT COUNT(*) INTO v_grade FROM discipline_grades;
  SELECT COUNT(*) INTO v_roles FROM user_roles;

  RAISE NOTICE '';
  RAISE NOTICE '══════════════════════════════════════════════';
  RAISE NOTICE '✅  Seed completado exitosamente!';
  RAISE NOTICE '──────────────────────────────────────────────';
  RAISE NOTICE 'Totales en la base de datos:';
  RAISE NOTICE '  Academias:          %', v_acad;
  RAISE NOTICE '  Practitioners:      %', v_pract;
  RAISE NOTICE '  Membresías:         %', v_memb;
  RAISE NOTICE '  Discipline grades:  %', v_grade;
  RAISE NOTICE '  User roles:         %', v_roles;
  RAISE NOTICE '──────────────────────────────────────────────';
  RAISE NOTICE 'Credenciales:';
  RAISE NOTICE '  Instructores: instructor001.nombre@kombat-seed.cl';
  RAISE NOTICE '  Alumnos:      alumno0001.nombre@kombat-seed.cl';
  RAISE NOTICE '  Contraseña:   Kombat2026';
  RAISE NOTICE '══════════════════════════════════════════════';
END;
$$;

COMMIT;

-- ---------------------------------------------------------------------------
-- Script de limpieza (ejecutar sólo para revertir el seed)
-- ---------------------------------------------------------------------------
-- Para limpiar todos los datos generados por este script:
--
-- BEGIN;
-- DELETE FROM discipline_grades  WHERE practitioner_id IN (SELECT id FROM practitioners WHERE contact_email LIKE '%@kombat-seed.cl');
-- DELETE FROM academy_memberships WHERE practitioner_id IN (SELECT id FROM practitioners WHERE contact_email LIKE '%@kombat-seed.cl');
-- DELETE FROM user_roles          WHERE user_id IN (SELECT auth_user_id FROM practitioners WHERE contact_email LIKE '%@kombat-seed.cl' AND auth_user_id IS NOT NULL);
-- DELETE FROM academies           WHERE contact_email LIKE '%@kombat-seed.cl';
-- DELETE FROM practitioners       WHERE contact_email LIKE '%@kombat-seed.cl';
-- DELETE FROM auth.users          WHERE email LIKE '%@kombat-seed.cl';
-- COMMIT;
