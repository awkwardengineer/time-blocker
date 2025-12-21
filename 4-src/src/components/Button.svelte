<script>
  let { 
    variant = 'primary', // 'primary' | 'secondary'
    size = 'medium',    // 'small' | 'medium' | 'large'
    disabled = false,
    type = 'button',
    onclick,
    ariaLabel,
    ...restProps 
  } = $props();
  
  const baseClasses = 'focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-grey-80 text-grey-110 hover:bg-grey-90 focus:bg-grey-90 disabled:bg-grey-50 disabled:text-grey-100',
    secondary: 'bg-white text-grey-110 hover:bg-grey-20 focus:bg-grey-30 disabled:bg-white disabled:text-grey-60'
  };
  
  const sizeClasses = {
    small: 'px-2 py-1 text-sm',
    medium: 'px-4 py-2',
    large: 'px-6 py-3'
  };
  
  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`;
</script>

<button
  {type}
  {disabled}
  {onclick}
  {ariaLabel}
  class={classes}
  {...restProps}
>
  <slot />
</button>

