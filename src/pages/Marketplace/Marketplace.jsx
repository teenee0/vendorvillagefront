import './Marketplace.css';

function Marketplace() {
  const items = [
    { title: 'Item 1', description: 'Description for item 1' },
    { title: 'Item 2', description: 'Description for item 2' },
    { title: 'Item 3', description: 'Description for item 3' },
    { title: 'Item 4', description: 'Description for item 4' },
    { title: 'Item 5', description: 'Description for item 5' },
  ];

  return (
    <div className='marketplace-container'>
      <h1>Marketplace Page</h1>
      <ul className='marketplace-list'>
        {items.map((item, index) => (
          <li key={index} className='marketplace-item'>
            <h3 className='marketplace-item-title'>{item.title}</h3>
            <p className='marketplace-item-description'>
              {item.description}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Marketplace;