


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."create_stock_movement"("p_item_id" "uuid", "p_location_id" "uuid", "p_movement_type" character varying, "p_quantity" numeric, "p_reference_type" character varying, "p_reference_id" "uuid", "p_reference_no" character varying, "p_remarks" "text", "p_created_by" "uuid", "p_stock_effect" character varying DEFAULT 'PLUS'::character varying) RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
v_stock NUMERIC(18,4);
v_delta NUMERIC(18,4);
v_ledger_id UUID;
BEGIN


IF p_quantity <= 0 THEN
    RAISE EXCEPTION
    'Quantity must be greater than zero';
END IF;

IF p_reference_type NOT IN (
    'INITIAL_STOCK',
    'TRANSFER',
    'ADJUSTMENT',
    'MANUAL'
) THEN
    RAISE EXCEPTION
    'Invalid reference type';
END IF;

SELECT quantity
INTO v_stock
FROM current_stocks
WHERE item_id = p_item_id
  AND location_id = p_location_id
FOR UPDATE;

v_stock := COALESCE(v_stock, 0);

IF p_movement_type = 'IN' THEN

    v_delta := p_quantity;

ELSIF p_movement_type = 'OUT' THEN

    IF v_stock < p_quantity THEN
        RAISE EXCEPTION
        'Insufficient stock';
    END IF;

    v_delta := -p_quantity;

ELSIF p_movement_type = 'ADJ' THEN

    IF p_stock_effect = 'PLUS' THEN

        v_delta := p_quantity;

    ELSIF p_stock_effect = 'MINUS' THEN

        IF v_stock < p_quantity THEN
            RAISE EXCEPTION
            'Insufficient stock';
        END IF;

        v_delta := -p_quantity;

    ELSE

        RAISE EXCEPTION
        'Invalid stock effect';

    END IF;

ELSE

    RAISE EXCEPTION
    'Invalid movement type';

END IF;

INSERT INTO stock_ledgers (
    item_id,
    location_id,
    movement_type,
    quantity,
    reference_type,
    reference_id,
    reference_no,
    remarks,
    created_by
)
VALUES (
    p_item_id,
    p_location_id,
    p_movement_type,
    p_quantity,
    p_reference_type,
    p_reference_id,
    p_reference_no,
    p_remarks,
    p_created_by
)
RETURNING id
INTO v_ledger_id;

PERFORM upsert_current_stock(
    p_item_id,
    p_location_id,
    v_delta
);

RETURN v_ledger_id;


END;
$$;


ALTER FUNCTION "public"."create_stock_movement"("p_item_id" "uuid", "p_location_id" "uuid", "p_movement_type" character varying, "p_quantity" numeric, "p_reference_type" character varying, "p_reference_id" "uuid", "p_reference_no" character varying, "p_remarks" "text", "p_created_by" "uuid", "p_stock_effect" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_item_code"("p_prefix" character varying) RETURNS character varying
    LANGUAGE "plpgsql"
    AS $$
DECLARE
v_next_number BIGINT;
v_item_code VARCHAR;
BEGIN


INSERT INTO sku_sequences (
    prefix,
    last_number
)
VALUES (
    UPPER(p_prefix),
    0
)
ON CONFLICT (prefix)
DO NOTHING;

SELECT last_number
INTO v_next_number
FROM sku_sequences
WHERE prefix = UPPER(p_prefix)
FOR UPDATE;

v_next_number := v_next_number + 1;

UPDATE sku_sequences
SET
    last_number = v_next_number,
    updated_at = NOW()
WHERE prefix = UPPER(p_prefix);

v_item_code :=
    UPPER(p_prefix)
    || '-'
    || LPAD(v_next_number::TEXT, 6, '0');

RETURN v_item_code;


END;
$$;


ALTER FUNCTION "public"."generate_item_code"("p_prefix" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_stock"("p_item_id" "uuid", "p_location_id" "uuid") RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
v_stock NUMERIC(18,4);
BEGIN


SELECT quantity
INTO v_stock
FROM current_stocks
WHERE item_id = p_item_id
  AND location_id = p_location_id;

RETURN COALESCE(v_stock, 0);


END;
$$;


ALTER FUNCTION "public"."get_current_stock"("p_item_id" "uuid", "p_location_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN


NEW.updated_at = NOW();

RETURN NEW;


END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_current_stock"("p_item_id" "uuid", "p_location_id" "uuid", "p_delta" numeric) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN


INSERT INTO current_stocks (
    item_id,
    location_id,
    quantity,
    updated_at
)
VALUES (
    p_item_id,
    p_location_id,
    p_delta,
    NOW()
)
ON CONFLICT (item_id, location_id)
DO UPDATE
SET
    quantity = current_stocks.quantity + p_delta,
    updated_at = NOW();


END;
$$;


ALTER FUNCTION "public"."upsert_current_stock"("p_item_id" "uuid", "p_location_id" "uuid", "p_delta" numeric) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."api_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "method" character varying(20),
    "endpoint" "text",
    "status_code" integer,
    "response_time_ms" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."api_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "action" character varying(100) NOT NULL,
    "entity_name" character varying(100) NOT NULL,
    "entity_id" "uuid",
    "old_data" "jsonb",
    "new_data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."current_stocks" (
    "item_id" "uuid" NOT NULL,
    "location_id" "uuid" NOT NULL,
    "quantity" numeric(18,4) DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."current_stocks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_code" character varying(50) NOT NULL,
    "item_code_prefix" character varying(10) NOT NULL,
    "barcode" character varying(255),
    "item_name" character varying(255) NOT NULL,
    "item_type" character varying(30) NOT NULL,
    "base_unit_id" "uuid" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "deleted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "items_item_type_check" CHECK ((("item_type")::"text" = ANY ((ARRAY['RAW_MATERIAL'::character varying, 'FINISHED_GOOD'::character varying, 'SUPPLY'::character varying, 'ASSET'::character varying])::"text"[])))
);


ALTER TABLE "public"."items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "warehouse_id" "uuid" NOT NULL,
    "parent_id" "uuid",
    "code" character varying(50) NOT NULL,
    "name" character varying(255) NOT NULL,
    "level" character varying(20) NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "locations_level_check" CHECK ((("level")::"text" = ANY ((ARRAY['ZONE'::character varying, 'AISLE'::character varying, 'RACK'::character varying, 'BIN'::character varying])::"text"[])))
);


ALTER TABLE "public"."locations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" character varying(150) NOT NULL,
    "description" "text"
);


ALTER TABLE "public"."permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."role_permissions" (
    "role_id" "uuid" NOT NULL,
    "permission_id" "uuid" NOT NULL
);


ALTER TABLE "public"."role_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(100) NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sku_sequences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "prefix" character varying(10) NOT NULL,
    "last_number" bigint DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."sku_sequences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_ledgers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_id" "uuid" NOT NULL,
    "location_id" "uuid" NOT NULL,
    "movement_type" character varying(10) NOT NULL,
    "quantity" numeric(18,4) NOT NULL,
    "reference_type" character varying(50),
    "reference_id" "uuid",
    "reference_no" character varying(100),
    "remarks" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "stock_ledgers_movement_type_check" CHECK ((("movement_type")::"text" = ANY ((ARRAY['IN'::character varying, 'OUT'::character varying, 'ADJ'::character varying])::"text"[]))),
    CONSTRAINT "stock_ledgers_quantity_check" CHECK (("quantity" > (0)::numeric)),
    CONSTRAINT "stock_ledgers_reference_type_check" CHECK ((("reference_type")::"text" = ANY ((ARRAY['INITIAL_STOCK'::character varying, 'TRANSFER'::character varying, 'ADJUSTMENT'::character varying, 'MANUAL'::character varying])::"text"[])))
);


ALTER TABLE "public"."stock_ledgers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_transfer_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "transfer_id" "uuid" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "qty_requested" numeric(18,4) NOT NULL,
    "qty_shipped" numeric(18,4),
    "qty_received" numeric(18,4)
);


ALTER TABLE "public"."stock_transfer_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_transfers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "transfer_no" character varying(50) NOT NULL,
    "source_warehouse_id" "uuid" NOT NULL,
    "destination_warehouse_id" "uuid" NOT NULL,
    "source_location_id" "uuid" NOT NULL,
    "destination_location_id" "uuid" NOT NULL,
    "status" character varying(30) NOT NULL,
    "remarks" "text",
    "requested_by" "uuid",
    "approved_by" "uuid",
    "received_by" "uuid",
    "requested_at" timestamp with time zone,
    "approved_at" timestamp with time zone,
    "shipped_at" timestamp with time zone,
    "received_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "stock_transfers_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['DRAFT'::character varying, 'REQUESTED'::character varying, 'PICKED'::character varying, 'IN_TRANSIT'::character varying, 'RECEIVED'::character varying, 'CANCELLED'::character varying])::"text"[])))
);


ALTER TABLE "public"."stock_transfers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_settings" (
    "key" character varying(100) NOT NULL,
    "value" "text",
    "description" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."system_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transfer_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "transfer_id" "uuid" NOT NULL,
    "event_type" character varying(50) NOT NULL,
    "event_by" "uuid",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."transfer_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."unit_conversions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_id" "uuid" NOT NULL,
    "from_unit_id" "uuid" NOT NULL,
    "to_unit_id" "uuid" NOT NULL,
    "multiplier" numeric(18,4) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_multiplier_positive" CHECK (("multiplier" > (0)::numeric))
);


ALTER TABLE "public"."unit_conversions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."units" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" character varying(20) NOT NULL,
    "name" character varying(100) NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."units" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "user_id" "uuid" NOT NULL,
    "role_id" "uuid" NOT NULL
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "username" character varying(100) NOT NULL,
    "full_name" character varying(255) NOT NULL,
    "password_hash" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "deleted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."warehouses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" character varying(50) NOT NULL,
    "name" character varying(255) NOT NULL,
    "address" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."warehouses" OWNER TO "postgres";


ALTER TABLE ONLY "public"."api_logs"
    ADD CONSTRAINT "api_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."current_stocks"
    ADD CONSTRAINT "current_stocks_pkey" PRIMARY KEY ("item_id", "location_id");



ALTER TABLE ONLY "public"."items"
    ADD CONSTRAINT "items_barcode_key" UNIQUE ("barcode");



ALTER TABLE ONLY "public"."items"
    ADD CONSTRAINT "items_item_code_key" UNIQUE ("item_code");



ALTER TABLE ONLY "public"."items"
    ADD CONSTRAINT "items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_warehouse_id_code_key" UNIQUE ("warehouse_id", "code");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id", "permission_id");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sku_sequences"
    ADD CONSTRAINT "sku_sequences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sku_sequences"
    ADD CONSTRAINT "sku_sequences_prefix_key" UNIQUE ("prefix");



ALTER TABLE ONLY "public"."stock_ledgers"
    ADD CONSTRAINT "stock_ledgers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_transfer_items"
    ADD CONSTRAINT "stock_transfer_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_transfers"
    ADD CONSTRAINT "stock_transfers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_transfers"
    ADD CONSTRAINT "stock_transfers_transfer_no_key" UNIQUE ("transfer_no");



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."transfer_events"
    ADD CONSTRAINT "transfer_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."unit_conversions"
    ADD CONSTRAINT "unit_conversions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."units"
    ADD CONSTRAINT "units_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."units"
    ADD CONSTRAINT "units_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."unit_conversions"
    ADD CONSTRAINT "uq_unit_conversion" UNIQUE ("item_id", "from_unit_id", "to_unit_id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id", "role_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."warehouses"
    ADD CONSTRAINT "warehouses_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."warehouses"
    ADD CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_api_logs_created_at" ON "public"."api_logs" USING "btree" ("created_at");



CREATE INDEX "idx_audit_logs_created_at" ON "public"."audit_logs" USING "btree" ("created_at");



CREATE INDEX "idx_audit_logs_user" ON "public"."audit_logs" USING "btree" ("user_id");



CREATE INDEX "idx_current_stocks_item" ON "public"."current_stocks" USING "btree" ("item_id");



CREATE INDEX "idx_current_stocks_location" ON "public"."current_stocks" USING "btree" ("location_id");



CREATE INDEX "idx_items_active" ON "public"."items" USING "btree" ("is_active");



CREATE INDEX "idx_items_name" ON "public"."items" USING "btree" ("item_name");



CREATE INDEX "idx_items_type" ON "public"."items" USING "btree" ("item_type");



CREATE INDEX "idx_locations_level" ON "public"."locations" USING "btree" ("level");



CREATE INDEX "idx_locations_parent" ON "public"."locations" USING "btree" ("parent_id");



CREATE INDEX "idx_locations_warehouse" ON "public"."locations" USING "btree" ("warehouse_id");



CREATE INDEX "idx_stock_ledgers_created_at" ON "public"."stock_ledgers" USING "btree" ("created_at");



CREATE INDEX "idx_stock_ledgers_item" ON "public"."stock_ledgers" USING "btree" ("item_id");



CREATE INDEX "idx_stock_ledgers_location" ON "public"."stock_ledgers" USING "btree" ("location_id");



CREATE INDEX "idx_stock_ledgers_reference" ON "public"."stock_ledgers" USING "btree" ("reference_type", "reference_id");



CREATE INDEX "idx_stock_transfer_items_transfer" ON "public"."stock_transfer_items" USING "btree" ("transfer_id");



CREATE INDEX "idx_stock_transfers_created_at" ON "public"."stock_transfers" USING "btree" ("created_at");



CREATE INDEX "idx_stock_transfers_status" ON "public"."stock_transfers" USING "btree" ("status");



CREATE INDEX "idx_transfer_events_transfer" ON "public"."transfer_events" USING "btree" ("transfer_id");



CREATE OR REPLACE TRIGGER "trg_items_updated_at" BEFORE UPDATE ON "public"."items" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_sku_sequences_updated_at" BEFORE UPDATE ON "public"."sku_sequences" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_stock_transfers_updated_at" BEFORE UPDATE ON "public"."stock_transfers" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_units_updated_at" BEFORE UPDATE ON "public"."units" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_warehouses_updated_at" BEFORE UPDATE ON "public"."warehouses" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."current_stocks"
    ADD CONSTRAINT "current_stocks_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id");



ALTER TABLE ONLY "public"."current_stocks"
    ADD CONSTRAINT "current_stocks_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id");



ALTER TABLE ONLY "public"."items"
    ADD CONSTRAINT "items_base_unit_id_fkey" FOREIGN KEY ("base_unit_id") REFERENCES "public"."units"("id");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."locations"("id");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_ledgers"
    ADD CONSTRAINT "stock_ledgers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."stock_ledgers"
    ADD CONSTRAINT "stock_ledgers_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id");



ALTER TABLE ONLY "public"."stock_ledgers"
    ADD CONSTRAINT "stock_ledgers_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id");



ALTER TABLE ONLY "public"."stock_transfer_items"
    ADD CONSTRAINT "stock_transfer_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id");



ALTER TABLE ONLY "public"."stock_transfer_items"
    ADD CONSTRAINT "stock_transfer_items_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "public"."stock_transfers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_transfers"
    ADD CONSTRAINT "stock_transfers_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."stock_transfers"
    ADD CONSTRAINT "stock_transfers_destination_location_id_fkey" FOREIGN KEY ("destination_location_id") REFERENCES "public"."locations"("id");



ALTER TABLE ONLY "public"."stock_transfers"
    ADD CONSTRAINT "stock_transfers_destination_warehouse_id_fkey" FOREIGN KEY ("destination_warehouse_id") REFERENCES "public"."warehouses"("id");



ALTER TABLE ONLY "public"."stock_transfers"
    ADD CONSTRAINT "stock_transfers_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."stock_transfers"
    ADD CONSTRAINT "stock_transfers_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."stock_transfers"
    ADD CONSTRAINT "stock_transfers_source_location_id_fkey" FOREIGN KEY ("source_location_id") REFERENCES "public"."locations"("id");



ALTER TABLE ONLY "public"."stock_transfers"
    ADD CONSTRAINT "stock_transfers_source_warehouse_id_fkey" FOREIGN KEY ("source_warehouse_id") REFERENCES "public"."warehouses"("id");



ALTER TABLE ONLY "public"."transfer_events"
    ADD CONSTRAINT "transfer_events_event_by_fkey" FOREIGN KEY ("event_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."transfer_events"
    ADD CONSTRAINT "transfer_events_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "public"."stock_transfers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."unit_conversions"
    ADD CONSTRAINT "unit_conversions_from_unit_id_fkey" FOREIGN KEY ("from_unit_id") REFERENCES "public"."units"("id");



ALTER TABLE ONLY "public"."unit_conversions"
    ADD CONSTRAINT "unit_conversions_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."unit_conversions"
    ADD CONSTRAINT "unit_conversions_to_unit_id_fkey" FOREIGN KEY ("to_unit_id") REFERENCES "public"."units"("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."create_stock_movement"("p_item_id" "uuid", "p_location_id" "uuid", "p_movement_type" character varying, "p_quantity" numeric, "p_reference_type" character varying, "p_reference_id" "uuid", "p_reference_no" character varying, "p_remarks" "text", "p_created_by" "uuid", "p_stock_effect" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."create_stock_movement"("p_item_id" "uuid", "p_location_id" "uuid", "p_movement_type" character varying, "p_quantity" numeric, "p_reference_type" character varying, "p_reference_id" "uuid", "p_reference_no" character varying, "p_remarks" "text", "p_created_by" "uuid", "p_stock_effect" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_stock_movement"("p_item_id" "uuid", "p_location_id" "uuid", "p_movement_type" character varying, "p_quantity" numeric, "p_reference_type" character varying, "p_reference_id" "uuid", "p_reference_no" character varying, "p_remarks" "text", "p_created_by" "uuid", "p_stock_effect" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_item_code"("p_prefix" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."generate_item_code"("p_prefix" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_item_code"("p_prefix" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_stock"("p_item_id" "uuid", "p_location_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_stock"("p_item_id" "uuid", "p_location_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_stock"("p_item_id" "uuid", "p_location_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_current_stock"("p_item_id" "uuid", "p_location_id" "uuid", "p_delta" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_current_stock"("p_item_id" "uuid", "p_location_id" "uuid", "p_delta" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_current_stock"("p_item_id" "uuid", "p_location_id" "uuid", "p_delta" numeric) TO "service_role";


















GRANT ALL ON TABLE "public"."api_logs" TO "anon";
GRANT ALL ON TABLE "public"."api_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."api_logs" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."current_stocks" TO "anon";
GRANT ALL ON TABLE "public"."current_stocks" TO "authenticated";
GRANT ALL ON TABLE "public"."current_stocks" TO "service_role";



GRANT ALL ON TABLE "public"."items" TO "anon";
GRANT ALL ON TABLE "public"."items" TO "authenticated";
GRANT ALL ON TABLE "public"."items" TO "service_role";



GRANT ALL ON TABLE "public"."locations" TO "anon";
GRANT ALL ON TABLE "public"."locations" TO "authenticated";
GRANT ALL ON TABLE "public"."locations" TO "service_role";



GRANT ALL ON TABLE "public"."permissions" TO "anon";
GRANT ALL ON TABLE "public"."permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."permissions" TO "service_role";



GRANT ALL ON TABLE "public"."role_permissions" TO "anon";
GRANT ALL ON TABLE "public"."role_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."role_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."roles" TO "anon";
GRANT ALL ON TABLE "public"."roles" TO "authenticated";
GRANT ALL ON TABLE "public"."roles" TO "service_role";



GRANT ALL ON TABLE "public"."sku_sequences" TO "anon";
GRANT ALL ON TABLE "public"."sku_sequences" TO "authenticated";
GRANT ALL ON TABLE "public"."sku_sequences" TO "service_role";



GRANT ALL ON TABLE "public"."stock_ledgers" TO "anon";
GRANT ALL ON TABLE "public"."stock_ledgers" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_ledgers" TO "service_role";



GRANT ALL ON TABLE "public"."stock_transfer_items" TO "anon";
GRANT ALL ON TABLE "public"."stock_transfer_items" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_transfer_items" TO "service_role";



GRANT ALL ON TABLE "public"."stock_transfers" TO "anon";
GRANT ALL ON TABLE "public"."stock_transfers" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_transfers" TO "service_role";



GRANT ALL ON TABLE "public"."system_settings" TO "anon";
GRANT ALL ON TABLE "public"."system_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."system_settings" TO "service_role";



GRANT ALL ON TABLE "public"."transfer_events" TO "anon";
GRANT ALL ON TABLE "public"."transfer_events" TO "authenticated";
GRANT ALL ON TABLE "public"."transfer_events" TO "service_role";



GRANT ALL ON TABLE "public"."unit_conversions" TO "anon";
GRANT ALL ON TABLE "public"."unit_conversions" TO "authenticated";
GRANT ALL ON TABLE "public"."unit_conversions" TO "service_role";



GRANT ALL ON TABLE "public"."units" TO "anon";
GRANT ALL ON TABLE "public"."units" TO "authenticated";
GRANT ALL ON TABLE "public"."units" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."warehouses" TO "anon";
GRANT ALL ON TABLE "public"."warehouses" TO "authenticated";
GRANT ALL ON TABLE "public"."warehouses" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

alter table "public"."items" drop constraint "items_item_type_check";

alter table "public"."locations" drop constraint "locations_level_check";

alter table "public"."stock_ledgers" drop constraint "stock_ledgers_movement_type_check";

alter table "public"."stock_ledgers" drop constraint "stock_ledgers_reference_type_check";

alter table "public"."stock_transfers" drop constraint "stock_transfers_status_check";

alter table "public"."items" add constraint "items_item_type_check" CHECK (((item_type)::text = ANY ((ARRAY['RAW_MATERIAL'::character varying, 'FINISHED_GOOD'::character varying, 'SUPPLY'::character varying, 'ASSET'::character varying])::text[]))) not valid;

alter table "public"."items" validate constraint "items_item_type_check";

alter table "public"."locations" add constraint "locations_level_check" CHECK (((level)::text = ANY ((ARRAY['ZONE'::character varying, 'AISLE'::character varying, 'RACK'::character varying, 'BIN'::character varying])::text[]))) not valid;

alter table "public"."locations" validate constraint "locations_level_check";

alter table "public"."stock_ledgers" add constraint "stock_ledgers_movement_type_check" CHECK (((movement_type)::text = ANY ((ARRAY['IN'::character varying, 'OUT'::character varying, 'ADJ'::character varying])::text[]))) not valid;

alter table "public"."stock_ledgers" validate constraint "stock_ledgers_movement_type_check";

alter table "public"."stock_ledgers" add constraint "stock_ledgers_reference_type_check" CHECK (((reference_type)::text = ANY ((ARRAY['INITIAL_STOCK'::character varying, 'TRANSFER'::character varying, 'ADJUSTMENT'::character varying, 'MANUAL'::character varying])::text[]))) not valid;

alter table "public"."stock_ledgers" validate constraint "stock_ledgers_reference_type_check";

alter table "public"."stock_transfers" add constraint "stock_transfers_status_check" CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'REQUESTED'::character varying, 'PICKED'::character varying, 'IN_TRANSIT'::character varying, 'RECEIVED'::character varying, 'CANCELLED'::character varying])::text[]))) not valid;

alter table "public"."stock_transfers" validate constraint "stock_transfers_status_check";


