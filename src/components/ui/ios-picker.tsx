import "@/styles/ios-picker.css";
import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface PickerItem {
  value: string;
  label: string;
}

interface IOSPickerProps {
  items: PickerItem[];
  selectedValue?: string;
  onSelect: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const IOSPicker: React.FC<IOSPickerProps> = ({
  items,
  selectedValue,
  onSelect,
  placeholder = "Choisir une option",
  className,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PickerItem | null>(
    items.find(item => item.value === selectedValue) || null
  );
  const wheelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const item = items.find(item => item.value === selectedValue);
    setSelectedItem(item || null);
  }, [selectedValue, items]);

  const handleItemClick = (item: PickerItem) => {
    setSelectedItem(item);
    onSelect(item.value);
    setIsOpen(false);
  };

  const handleWheelScroll = () => {
    if (!wheelRef.current) return;
    
    const wheel = wheelRef.current;
    const domItems = wheel.querySelectorAll('.picker-item');
    const wheelRect = wheel.getBoundingClientRect();
    const centerY = wheelRect.top + wheelRect.height / 2;
    
    let closestItem: Element | null = null;
    let closestDistance = Infinity;
    
    domItems.forEach(item => {
      const itemRect = item.getBoundingClientRect();
      const itemCenterY = itemRect.top + itemRect.height / 2;
      const distance = Math.abs(itemCenterY - centerY);
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestItem = item;
      }
    });
    
    if (closestItem) {
      const value = closestItem.getAttribute('data-value');
      if (value) {
        const pickerItem = items.find(i => i.value === value);
        if (pickerItem) {
          setSelectedItem(pickerItem);
          onSelect(pickerItem.value);
        }
      }
    }
  };

  return (
    <div className={cn("relative", className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(true)}
        disabled={disabled}
        className={cn(
          "w-full px-4 py-3 text-left border border-gray-300 rounded-lg",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "bg-white text-gray-900"
        )}
      >
        {selectedItem ? selectedItem.label : placeholder}
      </button>

      {/* Picker Sheet */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Picker Sheet */}
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-lg z-50 max-h-[80vh] flex flex-col">
            {/* Toolbar */}
            <div className="flex justify-between items-center h-11 px-4 border-b border-gray-200">
              <div className="flex gap-2 text-gray-500">
                <span>‹</span>
                <span>›</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-blue-500 font-medium"
              >
                Terminé
              </button>
            </div>

            {/* Picker Wheel */}
            <div className="relative h-44 overflow-hidden">
              <div
                ref={wheelRef}
                className="h-full overflow-y-auto scroll-snap-y-mandatory scrollbar-hide"
                style={{
                  scrollBehavior: 'smooth',
                  WebkitOverflowScrolling: 'touch'
                }}
                onScroll={handleWheelScroll}
              >
                {/* Spacer items for centering */}
                <div className="h-22" />
                
                {items.map((item, index) => (
                  <div
                    key={item.value}
                    data-value={item.value}
                    className={cn(
                      "h-11 flex items-center justify-center text-base cursor-pointer",
                      "scroll-snap-align-center transition-colors",
                      selectedItem?.value === item.value 
                        ? "text-blue-500 font-medium" 
                        : "text-gray-900 hover:text-blue-500"
                    )}
                    onClick={() => handleItemClick(item)}
                  >
                    {item.label}
                  </div>
                ))}
                
                {/* Spacer items for centering */}
                <div className="h-22" />
              </div>

              {/* Selection Overlay */}
              <div className="absolute top-1/2 left-0 right-0 h-11 -translate-y-1/2 border-t border-b border-gray-300 pointer-events-none" />

              {/* Fade Masks */}
              <div className="absolute top-0 left-0 right-0 h-22 bg-gradient-to-b from-white to-transparent pointer-events-none" />
              <div className="absolute bottom-0 left-0 right-0 h-22 bg-gradient-to-t from-white to-transparent pointer-events-none" />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Multi-column picker for date/time selection
interface MultiColumnPickerProps {
  columns: {
    items: PickerItem[];
    selectedValue?: string;
    onSelect: (value: string) => void;
  }[];
  className?: string;
  disabled?: boolean;
}

export const MultiColumnIOSPicker: React.FC<MultiColumnPickerProps> = ({
  columns,
  className,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValues, setSelectedValues] = useState<string[]>(
    columns.map(col => col.selectedValue || col.items[0]?.value || '')
  );

  const handleColumnSelect = (columnIndex: number, value: string) => {
    const newValues = [...selectedValues];
    newValues[columnIndex] = value;
    setSelectedValues(newValues);
    columns[columnIndex].onSelect(value);
  };

  const getDisplayText = () => {
    return columns.map((col, index) => {
      const item = col.items.find(item => item.value === selectedValues[index]);
      return item?.label || col.items[0]?.label || '';
    }).join(' | ');
  };

  return (
    <div className={cn("relative", className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(true)}
        disabled={disabled}
        className={cn(
          "w-full px-4 py-3 text-left border border-gray-300 rounded-lg",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "bg-white text-gray-900"
        )}
      >
        {getDisplayText()}
      </button>

      {/* Picker Sheet */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Picker Sheet */}
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-lg z-50 max-h-[80vh] flex flex-col">
            {/* Toolbar */}
            <div className="flex justify-between items-center h-11 px-4 border-b border-gray-200">
              <div className="flex gap-2 text-gray-500">
                <span>‹</span>
                <span>›</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-blue-500 font-medium"
              >
                Terminé
              </button>
            </div>

            {/* Multi-column Picker */}
            <div className="relative h-44 overflow-hidden flex">
              {columns.map((column, columnIndex) => (
                <div key={columnIndex} className="flex-1 relative">
                  <div
                    className="h-full overflow-y-auto scroll-snap-y-mandatory scrollbar-hide border-r border-gray-200 last:border-r-0"
                    style={{
                      scrollBehavior: 'smooth',
                      WebkitOverflowScrolling: 'touch'
                    }}
                  >
                    {/* Spacer items for centering */}
                    <div className="h-22" />
                    
                    {column.items.map((item) => (
                      <div
                        key={item.value}
                        className={cn(
                          "h-11 flex items-center justify-center text-base cursor-pointer",
                          "scroll-snap-align-center transition-colors",
                          selectedValues[columnIndex] === item.value 
                            ? "text-blue-500 font-medium" 
                            : "text-gray-900 hover:text-blue-500"
                        )}
                        onClick={() => handleColumnSelect(columnIndex, item.value)}
                      >
                        {item.label}
                      </div>
                    ))}
                    
                    {/* Spacer items for centering */}
                    <div className="h-22" />
                  </div>

                  {/* Selection Overlay */}
                  <div className="absolute top-1/2 left-0 right-0 h-11 -translate-y-1/2 border-t border-b border-gray-300 pointer-events-none" />

                  {/* Fade Masks */}
                  <div className="absolute top-0 left-0 right-0 h-22 bg-gradient-to-b from-white to-transparent pointer-events-none" />
                  <div className="absolute bottom-0 left-0 right-0 h-22 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
