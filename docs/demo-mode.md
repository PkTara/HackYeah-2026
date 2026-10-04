# Demonstrating Climbing Monkey

Open **Tests → Demo controls**, next to **About this build**, and tick **Demo mode**. All mock switches start selected. Controls are also available on About, during first-run setup and on the backend loading/retry screen.

| Switch | Selected | Unselected |
|---|---|---|
| Sample profile | Example climbs, a sore finger, reach, six home-test results and 40 XP. Finish a quest to show the level-up celebration. | A separate demo server profile when configured, or an empty local demo profile offline. |
| Strava | Example bouldering activity on Profile. | Provider unavailable; no real integration exists. |
| Apple Health, Health Connect, Huawei Health, Garmin | Independently selectable example sleep and workout feeds on Profile. | Provider unavailable; no real integration exists. |
| Webcam input | Animated sample preview, photo capture, clip recording/review and live input. No camera permission requested. | The platform's actual camera and its usual permissions. |
| Analysis results | Labelled example photo, clip and live leg-spread results, including review and confirmed save. | Actual backend analysis; needs a real capture, configured server and installed pose model. |
| Hand-photo storage | Saves a demo journal entry and updates the demo finger flag; no image bytes uploaded or retained. | Actual private upload through the backend, using a separate demo identity. Requires a real capture. |
| Home-test results | A **Use demo result** button in each home test and setup test. Save through the normal flow. | The existing manual timer, counter or typed input. |
| Unavailable tests | Expandable shoulder-reach and finger-strength result previews, explicitly simulated. | The existing Soon cards. |

For a live presentation with a real webcam but no pose model, unselect **Webcam input** and leave **Analysis results** selected. Start the camera, take a photo or record a clip, agree to simulate it, then analyse, review and save. Live mode produces example results until stopped. Simulated results describe no measurement of the person in the preview.

Profile shows the selected provider feeds. **Sync demo integrations** demonstrates a refresh with deterministic example data. These feeds provide activity context; they are not route logs and do not affect climbing scores. Provider accounts, OAuth and real health imports are not implemented.

Saved camera results appear on Tests; saved hand entries appear on Hands. All demo screens display a Demo marker. Future-test previews are not saved as measurements. Running mode and automatic scoring remain outside the available app flows.

## Repeating the presentation

**Reset demo** starts a new isolated scenario while keeping the mock switches selected as before. A sample profile starts again with its example state; an unpopulated profile starts empty. Old asynchronous saves keep their previous scenario's storage and cannot appear in the new one. Settings and the current scenario survive a reload.

Demo mode never reuses the normal profile's token. If real services are selected during a demo, the configured server gets a separate anonymous demo profile. Reset retires that identity; it does not delete earlier server profiles or retained real photos. To delete a real demo server profile and its photos, use **Reset profile** while that profile is selected, before Reset demo. The mock journal retains entries and simulated save metadata, not real photo bytes.

Turn **Demo mode** off to return to the normal profile and the configured real services. Individual mock switches have no effect while demo mode is off.
