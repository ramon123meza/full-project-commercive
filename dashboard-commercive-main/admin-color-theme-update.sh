#!/bin/bash

# Admin Color Theme Update Script
# This script updates all admin pages with better contrast colors
#
# Old colors (poor contrast):
# - text-[#5e568f] (dark purple on dark purple - hard to read)
# - bg-[#342d5f] (very dark buttons)
# - color: rgb(79, 17, 201) (icons)
#
# New colors (high contrast):
# - text-[#E5E1FF] (light purple on dark purple - easy to read)
# - bg-[#6B5FD1] (brighter purple buttons)
# - color: #E5E1FF (light purple icons)

echo "Updating admin color palette for better contrast..."

# Update text colors for better readability
find src/components/admin -type f -name "*.tsx" -exec sed -i 's/text-\[#5e568f\]/text-[#E5E1FF]/g' {} +
find src/components/admin -type f -name "*.tsx" -exec sed -i 's/text-\[#403a6b\]/text-[#B8B1E0]/g' {} +

# Update button background colors
find src/components/admin -type f -name "*.tsx" -exec sed -i 's/bg-\[#342d5f\]/bg-[#6B5FD1]/g' {} +
find src/components/admin -type f -name "*.tsx" -exec sed -i 's/bg-\[#403a6b\]/bg-[#5B4BB5]/g' {} +

# Update icon colors
find src/components/admin -type f -name "*.tsx" -exec sed -i 's/color="rgb(79, 17, 201)"/color="#E5E1FF"/g' {} +
find src/app/\(authentificated\)/admin -type f -name "*.tsx" -exec sed -i 's/color="rgb(79, 17, 201)"/color="#E5E1FF"/g' {} +

# Update border colors for better visibility
find src/components/admin -type f -name "*.tsx" -exec sed -i 's/borderColor: "#403a6b"/borderColor: "#8B7FE5"/g' {} +
find src/components/admin -type f -name "*.tsx" -exec sed -i 's/border-\[#403a6b\]/border-[#8B7FE5]/g' {} +

echo "✓ Color palette updated successfully!"
echo ""
echo "New color scheme:"
echo "  - Text: #E5E1FF (light purple - high contrast)"
echo "  - Buttons: #6B5FD1 (bright purple)"
echo "  - Icons: #E5E1FF (light purple)"
echo "  - Borders: #8B7FE5 (medium purple)"
echo ""
echo "Background remains: #1b1838 (dark purple)"
