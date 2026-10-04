# Demonstrating Climbing Monkey

Open **Data → Demo controls** and tick **Demo mode**. All mock switches start selected. The controls are also on About, Settings, every first-run setup step and the backend loading and retry screen.

| Switch | Selected | Unselected |
|---|---|---|
| Sample profile | Example climbs, a sore finger, reach, six home-test results and 40 XP. Finish a quest to show the level-up celebration. | A separate demo server profile when configured, or an empty local demo profile offline. |
| Strava | Example bouldering activity on Profile. | Provider unavailable; no real integration exists. |
| Apple Health, Health Connect, Huawei Health, Garmin | Independently selectable example sleep and workout feeds on Profile. | Provider unavailable; no real integration exists. |
| Webcam input | Animated sample preview and live body markings. No camera permission requested. | The platform's actual camera and its usual permissions. |
| Analysis results | Labelled live leg-spread and bilateral shoulder results, including automatic completion and reviewed save. | Actual backend analysis; needs a real capture, configured server and installed pose model. |
| Hand-photo storage | Saves a demo journal entry and updates the demo finger flag; no image bytes uploaded or retained. | Actual private upload through the backend, using a separate demo identity. Requires a real capture. |
| Manual assessment examples | A **Use demo result** button in each home/setup test and **Fill example reading** in Finger strength. Save through the normal flow. | The existing manual timer, counter or typed input. |

For a live presentation with a real webcam but no pose model, unselect **Webcam input** and leave **Analysis results** selected. Enable camera-analysis permission in setup or Settings, then press **Record**, hold the guided position, and review/save after automatic completion or **Stop**. Recording streams sampled frames; it does not create a video file. Live demo analysis generates sample results locally. Simulated results describe no measurement of the person in the preview.

Profile shows the selected provider feeds. **Sync demo integrations** demonstrates a refresh with deterministic example data. These feeds provide activity context; they are not route logs and do not affect climbing scores. Provider accounts, OAuth and real health imports are not implemented.

Saved camera and instrument-force results appear on Data and Profile with their history and a simulated label; saved hand entries appear on Hands. Finger strength has a real instrument-reading form: **Fill example reading** fills labelled values for review and save. All demo screens show a Demo marker.

Gazelle (running) and dolphin (swimming) modes are not part of the demo. Their sessions stay in normal on-device storage, are not reset by **Reset demo**, and the Demo marker is hidden while either is shown. No app flow computes an ability score.

## Repeating the presentation

**Reset demo** starts a new isolated scenario while keeping the mock switches selected as before. A sample profile starts again with its example state; an unpopulated profile starts empty. Old asynchronous saves keep their previous scenario's storage and cannot appear in the new one. Settings and the current scenario survive a reload.

Demo mode never reuses the normal profile's token. If real services are selected during a demo, the configured server gets a separate anonymous demo profile. Reset retires that identity; it does not delete earlier server profiles or retained real photos. To delete a real demo server profile and its photos, use **Reset profile** while that profile is selected, before Reset demo. The mock journal retains entries and simulated save metadata, not real photo bytes.

Turn **Demo mode** off to return to the normal profile and the configured real services. Individual mock switches have no effect while demo mode is off.

Camera-analysis and private-hand-photo permissions are separate, optional app settings. Demo mode does not grant either. Permission choices remain independent of demo resets; revoking analysis stops an active session. Every submenu, including demo controls and review stages, has breadcrumbs back to its parent.
