-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'CUSTOMER', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PROCESSING', 'PRINTING', 'PACKAGING', 'SHIPPING', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PAID', 'REFUNDED');

-- CreateEnum
CREATE TYPE "LayerType" AS ENUM ('FILL', 'STROKE', 'TEXT', 'IMAGE', 'GROUP');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20),
    "company_name" VARCHAR(150),
    "dob" TIMESTAMP(3),
    "gender" VARCHAR(20),
    "address" TEXT,
    "profile_image_url" VARCHAR(512),

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admins" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "department" VARCHAR(100),
    "access_level" VARCHAR(50) NOT NULL DEFAULT 'STANDARD',

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "parent_id" UUID,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_templates" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "category_id" UUID NOT NULL,
    "description" TEXT,
    "base_price" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "brand_name" VARCHAR(100),
    "name" VARCHAR(150) NOT NULL,
    "slug" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "base_price" DECIMAL(10,2) NOT NULL,
    "is_customizable" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_images" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "image_url" VARCHAR(512) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sizes" (
    "id" UUID NOT NULL,
    "name" VARCHAR(10) NOT NULL,
    "chart_category" VARCHAR(50) NOT NULL DEFAULT 'ADULT_UNISEX',

    CONSTRAINT "sizes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materials" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "texture_url" VARCHAR(512),

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "sku" VARCHAR(100) NOT NULL,
    "size_id" UUID NOT NULL,
    "material_id" UUID NOT NULL,
    "upcharge" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "stock_quantity" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "svg_files" (
    "id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "svg_raw" TEXT NOT NULL,
    "width" INTEGER NOT NULL DEFAULT 800,
    "height" INTEGER NOT NULL DEFAULT 800,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "svg_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "svg_uploads" (
    "id" UUID NOT NULL,
    "svg_url" VARCHAR(512) NOT NULL,
    "svg_raw" TEXT NOT NULL,
    "width" INTEGER NOT NULL DEFAULT 800,
    "height" INTEGER NOT NULL DEFAULT 800,
    "layers_json" JSONB NOT NULL,
    "is_consumed" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "svg_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "svg_views" (
    "id" UUID NOT NULL,
    "svg_file_id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "svg_raw" TEXT NOT NULL,
    "svg_url" VARCHAR(512),
    "view_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "svg_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "svg_layers" (
    "id" UUID NOT NULL,
    "svg_view_id" UUID NOT NULL,
    "element_id" VARCHAR(100) NOT NULL,
    "layer_name" VARCHAR(100) NOT NULL,
    "layer_type" "LayerType" NOT NULL,
    "default_color" VARCHAR(7),
    "parent_group_id" VARCHAR(100),

    CONSTRAINT "svg_layers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_layer_mappings" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "svg_layer_id" UUID NOT NULL,
    "is_editable" BOOLEAN NOT NULL DEFAULT true,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "default_color_value" VARCHAR(7),

    CONSTRAINT "product_layer_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "layer_groups" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "layer_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "layer_group_layers" (
    "id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "svg_layer_id" UUID NOT NULL,
    "display_label" VARCHAR(100),
    "display_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "layer_group_layers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "colors" (
    "id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "hex_code" VARCHAR(7) NOT NULL,
    "color_group" VARCHAR(50),

    CONSTRAINT "colors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_colors" (
    "product_id" UUID NOT NULL,
    "color_id" UUID NOT NULL,

    CONSTRAINT "product_colors_pkey" PRIMARY KEY ("product_id","color_id")
);

-- CreateTable
CREATE TABLE "patterns" (
    "id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "image_url" VARCHAR(512) NOT NULL,
    "svg_pattern_data" TEXT,

    CONSTRAINT "patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_patterns" (
    "product_id" UUID NOT NULL,
    "pattern_id" UUID NOT NULL,

    CONSTRAINT "product_patterns_pkey" PRIMARY KEY ("product_id","pattern_id")
);

-- CreateTable
CREATE TABLE "fonts" (
    "id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "font_family" VARCHAR(100) NOT NULL,
    "font_url" VARCHAR(512),

    CONSTRAINT "fonts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_fonts" (
    "product_id" UUID NOT NULL,
    "font_id" UUID NOT NULL,

    CONSTRAINT "product_fonts_pkey" PRIMARY KEY ("product_id","font_id")
);

-- CreateTable
CREATE TABLE "product_configurations" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "default_pattern_id" UUID,
    "default_font_id" UUID,
    "allow_logos" BOOLEAN NOT NULL DEFAULT true,
    "max_logos" INTEGER NOT NULL DEFAULT 5,
    "text_length_limit" INTEGER NOT NULL DEFAULT 15,

    CONSTRAINT "product_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upcharge_rules" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "option_type" VARCHAR(50) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "upcharge_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quantity_discount_rules" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "min_quantity" INTEGER NOT NULL,
    "discount_percentage" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "quantity_discount_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_designs" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "configuration_json" JSONB NOT NULL,
    "preview_image_url" VARCHAR(512),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_designs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_design_versions" (
    "id" UUID NOT NULL,
    "saved_design_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "configuration_json" JSONB NOT NULL,
    "preview_image_url" VARCHAR(512),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_design_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_design_rosters" (
    "id" UUID NOT NULL,
    "saved_design_id" UUID NOT NULL,
    "player_name" VARCHAR(100) NOT NULL,
    "player_number" VARCHAR(5) NOT NULL,
    "size_id" UUID NOT NULL,

    CONSTRAINT "saved_design_rosters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carts" (
    "id" UUID NOT NULL,
    "customer_id" UUID,
    "session_id" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" UUID NOT NULL,
    "cart_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "variant_id" UUID,
    "saved_design_id" UUID,
    "quantity" INTEGER NOT NULL,
    "custom_text_json" JSONB,
    "logo_url" VARCHAR(512),
    "subtotal_price" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_item_rosters" (
    "id" UUID NOT NULL,
    "cart_item_id" UUID NOT NULL,
    "player_name" VARCHAR(100) NOT NULL,
    "player_number" VARCHAR(5) NOT NULL,
    "size_id" UUID NOT NULL,

    CONSTRAINT "cart_item_rosters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "discount_type" "DiscountType" NOT NULL,
    "discount_value" DECIMAL(10,2) NOT NULL,
    "min_order_value" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "max_discount" DECIMAL(10,2),
    "start_date" TIMESTAMP(3) NOT NULL,
    "expiry_date" TIMESTAMP(3) NOT NULL,
    "usage_limit" INTEGER,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipping_addresses" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "recipient_name" VARCHAR(150) NOT NULL,
    "street" VARCHAR(255) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "state" VARCHAR(100) NOT NULL,
    "postal_code" VARCHAR(20) NOT NULL,
    "country" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "shipping_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "order_number" VARCHAR(100) NOT NULL,
    "customer_id" UUID NOT NULL,
    "coupon_id" UUID,
    "shipping_address_id" UUID NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "net_amount" DECIMAL(10,2) NOT NULL,
    "order_status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "tracking_number" VARCHAR(100),
    "notes" TEXT,
    "signature_agreed" BOOLEAN NOT NULL DEFAULT false,
    "signature_url" VARCHAR(512),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "variant_id" UUID,
    "saved_design_id" UUID,
    "quantity" INTEGER NOT NULL,
    "custom_text_json" JSONB,
    "logo_url" VARCHAR(512),
    "unit_price" DECIMAL(10,2) NOT NULL,
    "total_price" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_item_rosters" (
    "id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,
    "player_name" VARCHAR(100) NOT NULL,
    "player_number" VARCHAR(5) NOT NULL,
    "size_id" UUID NOT NULL,

    CONSTRAINT "order_item_rosters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "payment_method" VARCHAR(50) NOT NULL,
    "transaction_reference" VARCHAR(255) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "payment_status" VARCHAR(50) NOT NULL,
    "payload_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "invoice_number" VARCHAR(100) NOT NULL,
    "pdf_url" VARCHAR(512) NOT NULL,
    "issue_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" TIMESTAMP(3),

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_queues" (
    "id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'QUEUED',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "production_queues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_export_files" (
    "id" UUID NOT NULL,
    "production_queue_id" UUID NOT NULL,
    "file_type" VARCHAR(10) NOT NULL,
    "file_url" VARCHAR(512) NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "production_export_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "message" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "key" VARCHAR(100) NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "action" VARCHAR(100) NOT NULL,
    "entity_name" VARCHAR(100) NOT NULL,
    "entity_id" UUID,
    "payload_json" JSONB,
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE INDEX "verification_tokens_token_idx" ON "verification_tokens"("token");

-- CreateIndex
CREATE INDEX "verification_tokens_user_id_type_used_idx" ON "verification_tokens"("user_id", "type", "used");

-- CreateIndex
CREATE UNIQUE INDEX "customers_user_id_key" ON "customers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "admins_user_id_key" ON "admins"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_slug_idx" ON "products"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "sizes_name_key" ON "sizes"("name");

-- CreateIndex
CREATE UNIQUE INDEX "materials_name_key" ON "materials"("name");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");

-- CreateIndex
CREATE INDEX "product_variants_product_id_idx" ON "product_variants"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "svg_files_template_id_key" ON "svg_files"("template_id");

-- CreateIndex
CREATE UNIQUE INDEX "svg_views_svg_file_id_name_key" ON "svg_views"("svg_file_id", "name");

-- CreateIndex
CREATE INDEX "svg_layers_svg_view_id_idx" ON "svg_layers"("svg_view_id");

-- CreateIndex
CREATE UNIQUE INDEX "svg_layers_svg_view_id_element_id_key" ON "svg_layers"("svg_view_id", "element_id");

-- CreateIndex
CREATE INDEX "product_layer_mappings_product_id_idx" ON "product_layer_mappings"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_layer_mappings_product_id_svg_layer_id_key" ON "product_layer_mappings"("product_id", "svg_layer_id");

-- CreateIndex
CREATE INDEX "layer_groups_product_id_idx" ON "layer_groups"("product_id");

-- CreateIndex
CREATE INDEX "layer_group_layers_group_id_idx" ON "layer_group_layers"("group_id");

-- CreateIndex
CREATE UNIQUE INDEX "layer_group_layers_group_id_svg_layer_id_key" ON "layer_group_layers"("group_id", "svg_layer_id");

-- CreateIndex
CREATE UNIQUE INDEX "colors_hex_code_key" ON "colors"("hex_code");

-- CreateIndex
CREATE UNIQUE INDEX "patterns_name_key" ON "patterns"("name");

-- CreateIndex
CREATE UNIQUE INDEX "patterns_slug_key" ON "patterns"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "fonts_name_key" ON "fonts"("name");

-- CreateIndex
CREATE UNIQUE INDEX "product_configurations_product_id_key" ON "product_configurations"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "upcharge_rules_product_id_option_type_key" ON "upcharge_rules"("product_id", "option_type");

-- CreateIndex
CREATE UNIQUE INDEX "quantity_discount_rules_product_id_min_quantity_key" ON "quantity_discount_rules"("product_id", "min_quantity");

-- CreateIndex
CREATE INDEX "saved_designs_customer_id_idx" ON "saved_designs"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "saved_design_versions_saved_design_id_version_number_key" ON "saved_design_versions"("saved_design_id", "version_number");

-- CreateIndex
CREATE UNIQUE INDEX "carts_session_id_key" ON "carts"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- CreateIndex
CREATE INDEX "orders_customer_id_idx" ON "orders"("customer_id");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_transaction_reference_key" ON "payments"("transaction_reference");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_order_id_key" ON "invoices"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- CreateIndex
CREATE UNIQUE INDEX "production_queues_order_item_id_key" ON "production_queues"("order_item_id");

-- CreateIndex
CREATE INDEX "production_queues_status_idx" ON "production_queues"("status");

-- AddForeignKey
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admins" ADD CONSTRAINT "admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_templates" ADD CONSTRAINT "product_templates_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "product_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_size_id_fkey" FOREIGN KEY ("size_id") REFERENCES "sizes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "svg_files" ADD CONSTRAINT "svg_files_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "product_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "svg_views" ADD CONSTRAINT "svg_views_svg_file_id_fkey" FOREIGN KEY ("svg_file_id") REFERENCES "svg_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "svg_layers" ADD CONSTRAINT "svg_layers_svg_view_id_fkey" FOREIGN KEY ("svg_view_id") REFERENCES "svg_views"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_layer_mappings" ADD CONSTRAINT "product_layer_mappings_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_layer_mappings" ADD CONSTRAINT "product_layer_mappings_svg_layer_id_fkey" FOREIGN KEY ("svg_layer_id") REFERENCES "svg_layers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "layer_groups" ADD CONSTRAINT "layer_groups_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "layer_group_layers" ADD CONSTRAINT "layer_group_layers_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "layer_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "layer_group_layers" ADD CONSTRAINT "layer_group_layers_svg_layer_id_fkey" FOREIGN KEY ("svg_layer_id") REFERENCES "svg_layers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_colors" ADD CONSTRAINT "product_colors_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_colors" ADD CONSTRAINT "product_colors_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "colors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_patterns" ADD CONSTRAINT "product_patterns_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_patterns" ADD CONSTRAINT "product_patterns_pattern_id_fkey" FOREIGN KEY ("pattern_id") REFERENCES "patterns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_fonts" ADD CONSTRAINT "product_fonts_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_fonts" ADD CONSTRAINT "product_fonts_font_id_fkey" FOREIGN KEY ("font_id") REFERENCES "fonts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_configurations" ADD CONSTRAINT "product_configurations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_configurations" ADD CONSTRAINT "product_configurations_default_pattern_id_fkey" FOREIGN KEY ("default_pattern_id") REFERENCES "patterns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_configurations" ADD CONSTRAINT "product_configurations_default_font_id_fkey" FOREIGN KEY ("default_font_id") REFERENCES "fonts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upcharge_rules" ADD CONSTRAINT "upcharge_rules_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quantity_discount_rules" ADD CONSTRAINT "quantity_discount_rules_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_designs" ADD CONSTRAINT "saved_designs_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_designs" ADD CONSTRAINT "saved_designs_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_design_versions" ADD CONSTRAINT "saved_design_versions_saved_design_id_fkey" FOREIGN KEY ("saved_design_id") REFERENCES "saved_designs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_design_rosters" ADD CONSTRAINT "saved_design_rosters_saved_design_id_fkey" FOREIGN KEY ("saved_design_id") REFERENCES "saved_designs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_design_rosters" ADD CONSTRAINT "saved_design_rosters_size_id_fkey" FOREIGN KEY ("size_id") REFERENCES "sizes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_saved_design_id_fkey" FOREIGN KEY ("saved_design_id") REFERENCES "saved_designs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_item_rosters" ADD CONSTRAINT "cart_item_rosters_cart_item_id_fkey" FOREIGN KEY ("cart_item_id") REFERENCES "cart_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_item_rosters" ADD CONSTRAINT "cart_item_rosters_size_id_fkey" FOREIGN KEY ("size_id") REFERENCES "sizes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_addresses" ADD CONSTRAINT "shipping_addresses_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_shipping_address_id_fkey" FOREIGN KEY ("shipping_address_id") REFERENCES "shipping_addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_saved_design_id_fkey" FOREIGN KEY ("saved_design_id") REFERENCES "saved_designs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_rosters" ADD CONSTRAINT "order_item_rosters_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_rosters" ADD CONSTRAINT "order_item_rosters_size_id_fkey" FOREIGN KEY ("size_id") REFERENCES "sizes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_queues" ADD CONSTRAINT "production_queues_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_export_files" ADD CONSTRAINT "production_export_files_production_queue_id_fkey" FOREIGN KEY ("production_queue_id") REFERENCES "production_queues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
