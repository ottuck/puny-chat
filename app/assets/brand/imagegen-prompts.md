# 선택한 아이콘의 파생 원본

선택: `docs/design/icon-candidates/02-soft-cream.png`.
편집 도구: 내장 ImageGen. 원본 디자인은 그대로 `puny-icon-source.png`에 복사했다.

## puny-character.png

```text
Use case: background-extraction. Edit target: the provided puny-chat icon candidate 2. Remove ONLY the warm ivory cream background outside the mascot and make that exterior truly transparent. Preserve the mascot exactly: peach round body, dark brown thick rounded outline, two dark pill eyes, curved little smile, rosy pink cheeks, shiny cream highlight on forehead, the two green sprout leaves and their dark brown outlines, tiny arms and feet. Keep exact pose, proportions, placement, colours, outline shapes, inner shading and expression from the original. Preserve all cream highlights INSIDE the character. No redraw, no stylistic change, no extra shapes, no cast shadow, no text. Keep the original square canvas and character's original position and size. Output PNG with real alpha transparency, not a checkerboard painted into the image.
```

## puny-monochrome.png

```text
Use case: precise-object-edit. Edit the provided transparent peach sprout mochi mascot into a SINGLE-COLOR monochrome app icon layer. Keep the EXACT original silhouette, proportions, sprout shape, arms, feet, pose and position on the same square canvas. Render the entire opaque silhouette as solid BLACK (#000000), with the two pill-shaped eyes and curved smiling mouth as clean TRANSPARENT cutouts (negative space) so the expression remains readable. Remove all colour, highlights and shading; no grey pixels except edge antialiasing. Exterior must remain truly transparent. Only the silhouette, two eye holes and smiling mouth hole. Do not add outline rings, background, decoration, cast shadow, or text. This is an Android themed app icon mask, PNG with actual alpha transparency.
```
