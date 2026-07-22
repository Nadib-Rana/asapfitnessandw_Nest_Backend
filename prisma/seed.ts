import { PrismaClient, DiscountType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';
import 'dotenv/config';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
  ssl:
    process.env.DATABASE_SSL === 'true'
      ? { rejectUnauthorized: false }
      : undefined,
});

const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log('Seeding database...');

  // 1. Clean existing database records safely using TRUNCATE CASCADE
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE 
      "users", "verification_tokens", "customers", "admins", "categories", 
      "product_templates", "products", "product_images", "sizes", "materials", 
      "product_variants", "svg_files", "svg_uploads", "svg_views", "svg_layers", 
      "product_layer_mappings", "colors", "product_colors", "patterns", "product_patterns", 
      "fonts", "product_fonts", "product_configurations", "upcharge_rules", 
      "quantity_discount_rules", "saved_designs", "saved_design_versions", "saved_design_rosters", 
      "carts", "cart_items", "cart_item_rosters", "coupons", "shipping_addresses", 
      "orders", "order_items", "order_item_rosters", "payments", "invoices", 
      "production_queues", "production_export_files", "notifications", "system_settings", 
      "audit_logs"
    CASCADE;
  `);

  // 2. Create Default Admin User
  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash('admin123', salt);
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      isActive: true,
      admin: {
        create: {
          department: 'Management',
          accessLevel: 'SUPER_ADMIN',
        },
      },
    },
  });
  console.log(`Created admin user: ${adminUser.email}`);

  // 3. Create Default Categories
  const categories = [
    { name: 'Football', slug: 'football', description: 'Team jerseys, socks, guards, and fully customizable kits.' },
    { name: 'Basketball', slug: 'basketball', description: 'Jerseys, lightweight shorts, shootarounds, and mesh bibs.' },
    { name: 'Tennis', slug: 'tennis', description: 'Breathable tennis shirts, skirts, wristbands, and visors.' },
    { name: 'Accessories', slug: 'accessories', description: 'Compression gear, socks, bags, and general athletic gear.' },
  ];

  for (const cat of categories) {
    await prisma.category.create({ data: cat });
  }
  console.log('Created product categories.');

  // Create default products
  const footballCat = await prisma.category.findFirst({ where: { slug: 'football' } });
  if (footballCat) {
    const template = await prisma.productTemplate.create({
      data: {
        name: 'Classic Football Jersey Template',
        categoryId: footballCat.id,
        description: 'Standard athletic layout with chest and back print layers.',
        basePrice: 150.00,
      }
    });

    await prisma.product.create({
      data: {
        name: 'Evolution Football Kit',
        slug: 'soccer-jersey',
        description: 'Evolution Football Kit with fully customizable colors, numbers, and sleeve/body materials.',
        basePrice: 199.00,
        isCustomizable: true,
        isActive: true,
        categoryId: footballCat.id,
        templateId: template.id,
        images: {
          create: [
            { imageUrl: 'https://images.unsplash.com/photo-1580087443864-44bfa286377e?w=500' }
          ]
        }
      }
    });

    await prisma.product.create({
      data: {
        name: 'Standard Team Shorts',
        slug: 'standard-team-shorts',
        description: 'Durable, lightweight athletic shorts designed for team matches.',
        basePrice: 49.00,
        isCustomizable: false,
        isActive: true,
        categoryId: footballCat.id,
        templateId: template.id,
        images: {
          create: [
            { imageUrl: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=500' }
          ]
        }
      }
    });
    console.log('Created default products.');
  }

  // 4. Create Sizes
  const sizes = [
    { name: 'S', chartCategory: 'ADULT_UNISEX' },
    { name: 'M', chartCategory: 'ADULT_UNISEX' },
    { name: 'L', chartCategory: 'ADULT_UNISEX' },
    { name: 'XL', chartCategory: 'ADULT_UNISEX' },
    { name: '2XL', chartCategory: 'ADULT_UNISEX' },
  ];
  for (const size of sizes) {
    await prisma.size.create({ data: size });
  }
  console.log('Created standard apparel sizes.');

  // 5. Create Default Custom Swatches (Colors)
  const colors = [
    { name: 'White', hexCode: '#FFFFFF', colorGroup: 'PRIMARY' },
    { name: 'Light Gray', hexCode: '#E5E7EB', colorGroup: 'NEUTRAL' },
    { name: 'Dark Slate', hexCode: '#1F2937', colorGroup: 'NEUTRAL' },
    { name: 'Pure Black', hexCode: '#111111', colorGroup: 'PRIMARY' },
    { name: 'Arsenal Red', hexCode: '#D81920', colorGroup: 'PRIMARY' },
    { name: 'Maroon', hexCode: '#7A1C1C', colorGroup: 'PRIMARY' },
    { name: 'Royal Blue', hexCode: '#1D4ED8', colorGroup: 'PRIMARY' },
  ];
  for (const color of colors) {
    await prisma.color.create({ data: color });
  }
  console.log('Created customizer color swatches.');

  // 6. Create Default Patterns
  const patterns = [
    { name: 'Classic Solid', slug: 'classic', imageUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=150&auto=format&fit=crop' },
    { name: 'Vertical Stripes', slug: 'striped', imageUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=150&auto=format&fit=crop' },
    { name: 'Diagonal Sash', slug: 'sash', imageUrl: 'https://images.unsplash.com/photo-1559551409-dadc959f76b8?q=80&w=150&auto=format&fit=crop' },
    { name: 'Modern Gradient', slug: 'gradients', imageUrl: 'https://images.unsplash.com/photo-1516738901171-8eb4fc13bd20?q=80&w=150&auto=format&fit=crop' },
  ];
  for (const pat of patterns) {
    await prisma.pattern.create({ data: pat });
  }
  console.log('Created default design patterns.');

  // 7. Create Default Fonts
  const fonts = [
    { name: 'Oswald Italic', fontFamily: 'font-heading' },
    { name: 'Arial Black', fontFamily: 'Arial-Black' },
    { name: 'Impact', fontFamily: 'Impact' },
  ];
  for (const font of fonts) {
    await prisma.font.create({ data: font });
  }
  console.log('Created default customization fonts.');

  // 8. Create Default Materials
  const materials = [
    { name: 'Premium Wool', description: 'Thick high-quality insulating wool weave' },
    { name: 'Genuine Leather', description: 'Premium top grain leather texture' },
    { name: 'Breathable Polyester Mesh', description: 'Sports grade lightweight polyester mesh' },
  ];
  for (const mat of materials) {
    await prisma.material.create({ data: mat });
  }
  console.log('Created raw garment materials.');

  // 9. Create Default Coupons
  const coupons = [
    {
      code: 'SAVE20',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 20.00,
      minOrderValue: 50.00,
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Active since yesterday
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Expiry 30 days
      isActive: true,
    },
    {
      code: 'WELCOME10',
      discountType: DiscountType.FIXED,
      discountValue: 10.00,
      minOrderValue: 20.00,
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true,
    },
  ];
  for (const c of coupons) {
    await prisma.coupon.create({ data: c });
  }
  console.log('Created default promo coupons.');

  console.log('Database seeding successfully finished!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
