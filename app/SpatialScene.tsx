import { assetPath } from './asset-path';
import { authoredScenes, AuthoredSceneId } from './scene-registry';

/** Shared art direction with native mobile sources and no canvas dependency. */
export default function SpatialScene({ scene, eager = false, foreground = false }: {
  scene: AuthoredSceneId; eager?: boolean; foreground?: boolean;
}) {
  const art = authoredScenes[scene];
  const picture = (front: boolean) => (
    <picture className={front ? 'scene-foreground' : 'scene-background'}>
      <source media="(max-width: 819px)" type="image/avif" srcSet={assetPath(art.mobileAvif)} />
      <source media="(max-width: 819px)" type="image/webp" srcSet={assetPath(art.mobileBase)} />
      <source type="image/avif" srcSet={assetPath(art.desktopAvif)} />
      <img src={assetPath(art.desktopBase)} width={2048} height={1152} alt=""
        loading={eager ? 'eager' : 'lazy'} fetchPriority={eager && !front ? 'high' : 'auto'} decoding="async" />
    </picture>
  );
  return <div className={`spatial-scene scene-${scene}`} aria-hidden="true">
    {picture(false)}{foreground && picture(true)}<div className="scene-shade" />
  </div>;
}
