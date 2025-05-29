import React from "react";

const skeletonConfigs = {
  card: [
    { w: "100%", h: "15rem", rounded: false },            // main block (image/header)
    { w: "75%", h: "1.25rem" },                           // title
    { w: "100%", h: "1rem" },                             // subtitle
    { w: "83.33%", h: "1rem" },                           // description
    { w: "25%", h: "0.75rem" },                           // small tag left
    { w: "2rem", h: "2rem", rounded: "full" },           // circle avatar
  ],
  table: [
    { w: "100%", h: "3rem" },                             // header row
    { w: "100%", h: "2.5rem" },                           // row 1
    { w: "100%", h: "2.5rem" },                           // row 2
    { w: "100%", h: "2.5rem" },                           // row 3
    { w: "100%", h: "2.5rem" },                           // row 4
  ],
  // You can add more types and customize their skeleton shapes here
};

const SkeletonLoader = ({
  type = "card",
  count = 1,
  className = "",
  height,
  width,
}) => {
  const skeletonItems = Array(count).fill(0);

  const BaseSkeleton = ({
    styleHeight,
    styleWidth,
    rounded = "lg",
    className = "",
  }) => (
    <div
      className={`relative overflow-hidden bg-gray-200 ${
        rounded === "lg"
          ? "rounded-lg"
          : rounded === "full"
          ? "rounded-full"
          : rounded === "md"
          ? "rounded-md"
          : rounded === false
          ? ""
          : "rounded-md"
      } ${className}`}
      style={{ height: styleHeight, width: styleWidth }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-shimmer" />
    </div>
  );

  // Render skeleton blocks based on config dynamically
  const DynamicSkeleton = () => {
    const config = skeletonConfigs[type] || skeletonConfigs["card"];
    return (
      <div
        className={`bg-white rounded-xl shadow-sm overflow-hidden ${
          type === "table" ? "p-4" : "p-5 space-y-3"
        }`}
      >
        {config.map((block, idx) => (
          <BaseSkeleton
            key={idx}
            styleHeight={height || block.h}
            styleWidth={width || block.w}
            rounded={block.rounded === undefined ? "lg" : block.rounded}
          />
        ))}
      </div>
    );
  };

  return (
    <>
      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 1.5s infinite;
        }
      `}</style>

      {skeletonItems.map((_, index) => (
        <React.Fragment key={index}>
          <DynamicSkeleton />
        </React.Fragment>
      ))}
    </>
  );
};

export default SkeletonLoader;
