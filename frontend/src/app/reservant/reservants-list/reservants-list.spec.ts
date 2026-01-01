import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReservantsList } from './reservants-list';

describe('ReservantsList', () => {
  let component: ReservantsList;
  let fixture: ComponentFixture<ReservantsList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReservantsList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReservantsList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
