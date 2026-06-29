import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "БензОК",
    short_name: "БензОК",
    description: "Актуальная информация о наличии топлива на заправках рядом с вами",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [
      {
        src: "/benzok-logo.png",
        sizes: "any",
        type: "image/png",
      },
    ],
  };
}
