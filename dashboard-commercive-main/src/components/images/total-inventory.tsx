import * as React from "react";

const TotalInventory = (props: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.width}
    height={props.height}
    fill={props.color}
    viewBox="0 0 16 16"
  >
    <path
      fill={props.color}
      fillRule="evenodd"
      d="M1.889.5C1.122.5.5 1.122.5 1.889V14.11c0 .767.622 1.389 1.389 1.389h3.333c.767 0 1.39-.622 1.39-1.389v-3.055h3.055c.767 0 1.389-.622 1.389-1.39V6.612h3.055c.767 0 1.389-.622 1.389-1.389V1.89C15.5 1.122 14.878.5 14.111.5zM6.61 9.389H9.39V6.61H6.61zm-4.444 1.667v2.777h2.777v-2.777zm0-1.667h2.777V6.61H2.167zm7.222-4.445H6.61V2.167H9.39zm-7.222 0h2.777V2.167H2.167zm11.666 0h-2.777V2.167h2.777z"
      clipRule="evenodd"
    ></path>
  </svg>
);

export default TotalInventory;
