
/*
# Copy categories and subcategories to new user account

Copies all 9 categories and 8 subcategories from the original test account
(e69937e9-e3ee-4672-b079-149c3cad57b6) to the real user account
(a831ff27-67d0-4a80-81d7-9a31418934bc / jefherson.oliveiraa@gmail.com).

New UUIDs are generated for the new rows. Subcategory category_id foreign keys
are remapped to the new category UUIDs.
*/

DO $$
DECLARE
  new_uid  uuid := 'a831ff27-67d0-4a80-81d7-9a31418934bc';

  -- new category IDs
  cat_alimentacao  uuid := gen_random_uuid();
  cat_assinaturas  uuid := gen_random_uuid();
  cat_educacao     uuid := gen_random_uuid();
  cat_lazer        uuid := gen_random_uuid();
  cat_moradia      uuid := gen_random_uuid();
  cat_outros       uuid := gen_random_uuid();
  cat_saude        uuid := gen_random_uuid();
  cat_transporte   uuid := gen_random_uuid();
  cat_vestuario    uuid := gen_random_uuid();
BEGIN
  -- Insert categories
  INSERT INTO categories (id, name, color, user_id) VALUES
    (cat_alimentacao, 'Alimentação', '#f97316', new_uid),
    (cat_assinaturas, 'Assinaturas', '#06b6d4', new_uid),
    (cat_educacao,    'Educação',    '#14b8a6', new_uid),
    (cat_lazer,       'Lazer',       '#ec4899', new_uid),
    (cat_moradia,     'Moradia',     '#8b5cf6', new_uid),
    (cat_outros,      'Outros',      '#6b7280', new_uid),
    (cat_saude,       'Saúde',       '#22c55e', new_uid),
    (cat_transporte,  'Transporte',  '#3b82f6', new_uid),
    (cat_vestuario,   'Vestuário',   '#f59e0b', new_uid);

  -- Insert subcategories (remapped to new category IDs)
  INSERT INTO subcategories (id, name, category_id, user_id) VALUES
    (gen_random_uuid(), 'Almoço',      cat_alimentacao, new_uid),
    (gen_random_uuid(), 'Lanche',      cat_alimentacao, new_uid),
    (gen_random_uuid(), 'Festa',       cat_lazer,       new_uid),
    (gen_random_uuid(), 'Vôlei',       cat_lazer,       new_uid),
    (gen_random_uuid(), 'Internet',    cat_moradia,     new_uid),
    (gen_random_uuid(), 'Remédio',     cat_saude,       new_uid),
    (gen_random_uuid(), 'Suplementos', cat_saude,       new_uid),
    (gen_random_uuid(), 'Gasolina',    cat_transporte,  new_uid);
END $$;
