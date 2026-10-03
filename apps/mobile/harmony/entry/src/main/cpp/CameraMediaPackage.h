#pragma once
#include "RNOH/Package.h"
#include "RNOH/ArkTSTurboModule.h"

namespace rnoh {
class CameraMediaTurboModule : public ArkTSTurboModule {
 public:
  CameraMediaTurboModule(const ArkTSTurboModule::Context ctx, const std::string name)
      : ArkTSTurboModule(ctx, name) {
    methodMap_ = {
        ARK_ASYNC_METHOD_METADATA(readFrame, 1),
        ARK_ASYNC_METHOD_METADATA(releaseFrame, 1),
        ARK_ASYNC_METHOD_METADATA(releaseVideo, 1),
        ARK_ASYNC_METHOD_METADATA(recordVideo, 1),
    };
  }
};
class CameraMediaFactory : public TurboModuleFactoryDelegate {
 public:
  SharedTurboModule createTurboModule(Context ctx, const std::string& name) const override {
    if (name == "ClimbingCameraMedia") {
      return std::make_shared<CameraMediaTurboModule>(ctx, name);
    }
    return nullptr;
  }
};
class CameraMediaPackage : public Package {
 public:
  using Package::Package;
  std::unique_ptr<TurboModuleFactoryDelegate> createTurboModuleFactoryDelegate() override {
    return std::make_unique<CameraMediaFactory>();
  }
};
} // namespace rnoh
