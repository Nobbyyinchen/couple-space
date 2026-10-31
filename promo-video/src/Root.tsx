import { Composition } from "remotion";
import { Promo } from "./Promo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="CoupleSpace"
        component={Promo}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{brand: "情侣空间", tagline: "我们的专属小宇宙"}}
      />
    </>
  );
};
