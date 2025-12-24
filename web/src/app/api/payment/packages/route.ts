import { NextResponse } from "next/server";
import { getActivePackages } from "@/lib/db";

export async function GET() {
  try {
    const packages = await getActivePackages();

    return NextResponse.json({
      success: true,
      packages: packages.map((pkg) => ({
        id: pkg.id,
        name: pkg.name,
        nameEn: pkg.name_en,
        description: pkg.description,
        descriptionEn: pkg.description_en,
        credits: pkg.credits,
        price: Number(pkg.price),
        originalPrice: pkg.original_price ? Number(pkg.original_price) : null,
        isPopular: pkg.is_popular,
      })),
    });
  } catch (error) {
    console.error("Get packages error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
