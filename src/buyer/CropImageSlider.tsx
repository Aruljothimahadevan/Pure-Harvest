import { useState, useEffect } from "react";

export default function CropImageSlider({ photos }: { photos: string[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!photos || photos.length === 0) return;

    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % photos.length);
    }, 2000); // change every 2 sec

    return () => clearInterval(interval);
  }, [photos]);

  if (!photos || photos.length === 0) {
    return (
      <div className="w-full h-40 bg-gray-200 flex items-center justify-center text-3xl">
        🌾
      </div>
    );
  }

  return (
    <img
      src={photos[index]}
      className="w-full h-40 object-cover rounded-xl"
    />
  );
}