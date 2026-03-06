export function getCropImage(name: string) {
  const key = name
    .toLowerCase()
    .replace(/\s+/g, "_");

  try {
    return new URL(
      `../assets/crops/vegetables/${key}.jpg`,
      import.meta.url
    ).href;
  } catch {}

  try {
    return new URL(
      `../assets/crops/fruits/${key}.jpg`,
      import.meta.url
    ).href;
  } catch {}

  try {
    return new URL(
      `../assets/crops/Cerals&pulses/${key}.jpg`,
      import.meta.url
    ).href;
  } catch {}

  try {
    return new URL(
      `../assets/crops/Pulses/${key}.jpg`,
      import.meta.url
    ).href;
  } catch {}

  try {
    return new URL(
      `../assets/crops/nuts&seeds/${key}.jpg`,
      import.meta.url
    ).href;
  } catch {}

  return "/placeholder.jpg"; // fallback
}
