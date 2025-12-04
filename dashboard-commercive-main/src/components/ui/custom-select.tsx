import React from "react";
import Select from "react-select";
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import { GrLocation } from "react-icons/gr";

interface CustomSelectionProps {
  data?: { label: string; value: string }[];
  AutocompleteData?: { state: string; data: { label: string; value: string }[] }[];
  placeholder?: string;
  label?: string | any;
  className?: string;
  name?: string;
  isMulti?: boolean;
  errorMessage?: string;
  hookFormSetValue?: string;
  value?: any;
  onChange?: any;
  inputStyles?: any;
  icon?: boolean;
  Autocomplete?: boolean;
  onKeyDown?: boolean;
  disable?: boolean;
  isSearchableFalse?: boolean;
}

const CustomSelection = (props: CustomSelectionProps) => {
  const style = {
    control: (base: any) => ({
      ...base,
      border: '1px solid #D4D7DD',
      boxShadow: "none",
      height: props.inputStyles || '46px',
      borderRadius: "8px",
      paddingY: '12px',
      paddingX: '16px'
    }),
    valueContainer: (base: any) => ({
      ...base,
      width: '100%',
      height: '35px',
      maxWidth: '100%',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    }),
  };

  const flattenedOptions = props.AutocompleteData
    ? props.AutocompleteData.flatMap(stateGroup =>
      stateGroup.data.map((option: any) => ({ ...option, group: stateGroup.state }))
    )
    : [];


  const handleKeyDown = (event: any) => {
    if (event.key === 'Enter') {
      const inputValue = event.target.value;
      if (inputValue) {
        const newOption = { value: inputValue, label: inputValue };
        props.onChange(newOption, props.name);
      }
      event.preventDefault(); // Prevents the form from submitting
    }
  };

  return (
    <div className={`flex flex-col w-full`}>
      <label className="font-medium text-[16px] leading-[24px] text-[#3E4654]">
        {props.label}
      </label>
      <div className={`${props?.className}`}>
        {props.icon && (
          <GrLocation size={30} color="#9474E4" />
        )}
        {!props.Autocomplete ? (
          <Select
            name={props.name}
            isMulti={props.isMulti}
            value={props.value}
            onChange={(selectedOption: any) => { props.onChange(selectedOption, props.name) }}
            options={props?.data}
            placeholder={props.placeholder}
            isDisabled={props.disable}
            components={{
              IndicatorSeparator: () => null,
            }}
            isSearchable={props.isSearchableFalse ? false : true}
            styles={{
              ...style,
              control: (provided, state) => ({
                ...style.control(provided),
              }),
              option: (
                styles,
                {
                  isDisabled,
                  isSelected,
                  isFocused,
                }: { isDisabled: boolean; isSelected: boolean; isFocused: boolean },
              ) => ({
                ...styles,
                backgroundColor: isDisabled ? "red" : isSelected ? "#9474E4" : "#FFFFFF",
                color: isSelected ? "#FFFFFF" : "#000000",
                cursor: isDisabled ? "cursor-pointer" : "cursor-pointer",
                "&:hover": {
                  backgroundColor:
                    !isDisabled && !isSelected && isFocused ? "#d1c0fa" : "#9474E4",
                  color: isSelected ? "#FFFFFF" : "#000000"
                },
              }),
            }}
            className="w-full selection"
            onKeyDown={props.onKeyDown ? handleKeyDown : undefined}
          />
        ) : (
          <Autocomplete
            id="grouped-demo"
            value={{ value: props.value?.value, label: props.value?.label }}
            options={flattenedOptions.sort((a, b) => -b.group.localeCompare(a.group))}
            groupBy={(option) => option.group}
            getOptionLabel={(option) => option.label}
            onChange={(event, value) => {
              props.onChange(value, props.name);
            }}
            sx={{
              background: 'white',
              '.MuiInputBase-root.MuiOutlinedInput-root': {
                borderRadius: '8px',
                height: '46px',
                paddingY: '12px',
                // border: 'none',
                outline: 'none',
                border: '1px solid #D4D7DD',
              },
              '.MuiOutlinedInput-notchedOutline': {
                border: 'none',
                // borderBottom: '1px solid #d9d5d5',
                ":focus": 'none'
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                border: 'none',
              },
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                sx={{ height: '36px', paddingY: 0 }}
                placeholder={props.placeholder}
              />
            )}
          />
        )}
      </div>
    </div>
  );
};

export default CustomSelection;
