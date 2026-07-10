import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get("image");

    if (!image || !(image instanceof File)) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    if (!image.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image (JPG, PNG, or WebP)" },
        { status: 400 }
      );
    }

    if (image.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Image too large. Maximum size is 25 MB." },
        { status: 400 }
      );
    }

    const apiKey = process.env.REMOVE_BG_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not configured. Set REMOVE_BG_API_KEY env var." },
        { status: 500 }
      );
    }

    const apiFormData = new FormData();
    apiFormData.append("image_file", image, image.name);

    const apiResponse = await fetch(
      "https://api.remove.bg/v1.0/removebg",
      {
        method: "POST",
        headers: { "X-Api-Key": apiKey },
        body: apiFormData,
      }
    );

    if (!apiResponse.ok) {
      let errorDetail = "Unknown error";
      try {
        const errJson = (await apiResponse.json()) as {
          errors?: Array<{ title: string }>;
        };
        errorDetail = errJson.errors?.[0]?.title || JSON.stringify(errJson);
      } catch {
        errorDetail = await apiResponse.text();
      }

      return NextResponse.json(
        {
          error: "Remove.bg API error (" + apiResponse.status + ")",
          detail: errorDetail,
        },
        { status: apiResponse.status }
      );
    }

    return new NextResponse(apiResponse.body, {
      headers: {
        "Content-Type": "image/png",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
