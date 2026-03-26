import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "第二双眼睛",
    short_name: "第二双眼睛",
    description: "上传界面截图，获得真实 OpenAI 结构化评审结果与可执行优化建议。",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f6fb",
    theme_color: "#3268e3",
    icons: [
      {
        src: "/icon.png",
        sizes: "any",
        type: "image/png",
      },
    ],
  };
}
