Pod::Spec.new do |s|
  s.name        = 'NativeTabBar'
  s.version     = '1.0.0'
  s.summary     = 'Native iOS tab bar for GoMeal'
  s.description = 'A custom native UITabBar Expo module for GoMeal.'
  s.author      = 'GoMeal'
  s.homepage    = 'https://docs.expo.dev/modules/'
  s.platforms   = {
    :ios => '15.1'
  }
  s.source = { git: '' }

  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.dependency 'lottie-ios', '4.6.0'

  s.source_files = '**/*.{h,m,mm,swift,hpp,cpp}'

  # Everything inside ios/Assets/ gets copied into:
  # NativeTabBar.bundle
  s.resource_bundles = {
    'NativeTabBar' => [
      'Assets.xcassets',
      'ChefNex.json'
    ]
  }

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_VERSION' => '5.0'
  }
end