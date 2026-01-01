import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReservantCard } from './reservant-card';

describe('ReservantCard', () => {
  let component: ReservantCard;
  let fixture: ComponentFixture<ReservantCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReservantCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReservantCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
