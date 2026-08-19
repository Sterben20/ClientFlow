-- Dummy User for Local Testing
-- Since inserting into auth.users directly can be tricky with pgcrypto on some setups,
-- we'll just insert a direct profile and workspace for now if they don't exist.
-- In a real app, auth.users -> handle_new_user handles this, but for local UI testing,
-- we can insert raw data if we want. Let's do it cleanly by inserting a mock user into auth.users.

INSERT INTO auth.users (
    id,
    instance_id,
    email,
    role,
    aud,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin
)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000000',
    'admin@clientflow.local',
    'authenticated',
    'authenticated',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Admin User"}',
    FALSE
)
ON CONFLICT (id) DO NOTHING;

-- Note: The trigger 'on_auth_user_created' will automatically run upon the insert above!
-- It will create:
-- 1. A profile in `public.profiles`
-- 2. A workspace in `public.workspaces` (named 'Admin User Workspace')
-- 3. A membership in `public.memberships` linking them.

-- To seed clients, we need the workspace ID created by the trigger.
-- We can do this using an anonymous block.
DO $$
DECLARE
    v_workspace_id UUID;
    v_client_id_1 UUID;
    v_client_id_2 UUID;
    v_project_id_1 UUID;
    v_project_id_2 UUID;
BEGIN
    -- Get the workspace ID for our seeded admin user
    SELECT workspace_id INTO v_workspace_id
    FROM memberships
    WHERE profile_id = '00000000-0000-0000-0000-000000000000'
    LIMIT 1;

    -- Seed Clients
    INSERT INTO clients (workspace_id, name, company, email, phone, website, status)
    VALUES 
        (v_workspace_id, 'Acme Corp', 'Acme Corporation', 'contact@acme.inc', '+1-555-0100', 'https://acme.inc', 'active')
        RETURNING id INTO v_client_id_1;
        
    INSERT INTO clients (workspace_id, name, company, email, phone, website, status)
    VALUES 
        (v_workspace_id, 'Globex', 'Globex Inc', 'info@globex.com', '+1-555-0200', 'https://globex.com', 'prospect')
        RETURNING id INTO v_client_id_2;

    -- Seed Projects
    INSERT INTO projects (workspace_id, client_id, name, description, status, priority, start_date, due_date)
    VALUES 
        (v_workspace_id, v_client_id_1, 'Acme Website Redesign', 'Complete overhaul of the corporate website.', 'active', 'high', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days')
        RETURNING id INTO v_project_id_1;

    INSERT INTO projects (workspace_id, client_id, name, description, status, priority, start_date, due_date)
    VALUES 
        (v_workspace_id, v_client_id_2, 'Globex Marketing Campaign', 'Q3 Digital Marketing Campaign Strategy.', 'planning', 'medium', CURRENT_DATE + INTERVAL '7 days', CURRENT_DATE + INTERVAL '60 days')
        RETURNING id INTO v_project_id_2;

    -- Seed Tasks
    INSERT INTO tasks (workspace_id, project_id, client_id, assignee_id, title, description, priority, status)
    VALUES 
        (v_workspace_id, v_project_id_1, v_client_id_1, '00000000-0000-0000-0000-000000000000', 'Design Homepage Mockups', 'Create Figma mockups for the new homepage.', 'high', 'in_progress'),
        (v_workspace_id, v_project_id_1, v_client_id_1, '00000000-0000-0000-0000-000000000000', 'Client Approval', 'Get approval from Acme board.', 'medium', 'todo'),
        (v_workspace_id, v_project_id_2, v_client_id_2, '00000000-0000-0000-0000-000000000000', 'Initial Meeting', 'Kickoff meeting with Globex marketing team.', 'high', 'done');

    -- Seed Deals
    INSERT INTO deals (workspace_id, client_id, owner_id, name, value, expected_close_date, stage)
    VALUES 
        (v_workspace_id, v_client_id_2, '00000000-0000-0000-0000-000000000000', 'Q3 Campaign Retainer', 25000.00, CURRENT_DATE + INTERVAL '15 days', 'proposal');

END $$;
